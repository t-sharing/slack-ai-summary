import { WebClient } from '@slack/web-api';
import * as logger from 'firebase-functions/logger';

// Define the SlackMessage interface for better type safety
interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  [key: string]: any;
}

export class SlackService {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  /**
   * Get a user's timezone offset in seconds
   * 
   * @param userId The Slack user ID
   * @returns Timezone offset in seconds (e.g. 32400 for KST which is UTC+9)
   */
  async getUserTimezone(userId: string): Promise<number> {
    try {
      logger.info('Fetching user info for timezone', { userId });
      const result = await this.client.users.info({
        user: userId
      });
      
      if (!result.ok || !result.user) {
        logger.warn('Could not fetch user info, using UTC', { userId });
        return 0; // Default to UTC if we can't get user timezone
      }
      
      // Extract timezone offset in seconds
      const tzOffset = result.user.tz_offset || 0;
      logger.info('Got user timezone offset', { userId, tzOffset, tzName: result.user.tz });
      
      return tzOffset;
    } catch (error) {
      logger.error('Error getting user timezone:', error);
      return 0; // Default to UTC on error
    }
  }

  /**
   * Get today's messages from a channel based on user's timezone
   * 
   * @param channelId The ID of the channel to fetch messages from
   * @param userId The user ID to get timezone from (optional)
   * @returns Array of message objects
   */
  async getTodayMessages(channelId: string, userId?: string): Promise<SlackMessage[]> {
    try {
      // Get timezone offset if userId is provided
      let tzOffset = 0;
      if (userId) {
        tzOffset = await this.getUserTimezone(userId);
      }
      
      // Calculate today's start timestamp (midnight in user's timezone)
      const now = new Date();
      // Convert current time to user's local time
      const userLocalTime = new Date(now.getTime() + (tzOffset * 1000));
      // Set to midnight in user's timezone
      userLocalTime.setHours(0, 0, 0, 0);
      // Convert back to UTC for the timestamp
      const startOfDay = new Date(userLocalTime.getTime() - (tzOffset * 1000));
      const oldest = (startOfDay.getTime() / 1000).toString();
      
      logger.info('Fetching messages since', { 
        timestamp: oldest, 
        date: startOfDay.toISOString(),
        userTimezone: tzOffset / 3600 + " hours"
      });
      
      const result = await this.client.conversations.history({
        channel: channelId,
        oldest,
        limit: 1000 // Adjust as needed
      });
      
      return (result.messages || []) as SlackMessage[];
    } catch (error) {
      logger.error('Error getting channel messages:', error);
      throw error;
    }
  }

  /**
   * Get messages from a channel within a date range
   * 
   * @param channelId The ID of the channel
   * @param from Start time (unix timestamp)
   * @param to End time (unix timestamp)
   * @returns Array of message objects
   */
  async getChannelMessages(channelId: string, from: number, to: number): Promise<SlackMessage[]> {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        oldest: from.toString(),
        latest: to.toString(),
        limit: 1000 // Adjust as needed
      });
      
      if (!result.ok || !result.messages) {
        throw new Error(`Failed to fetch messages: ${result.error || 'Unknown error'}`);
      }
      
      return result.messages as SlackMessage[];
    } catch (error) {
      logger.error(`Error fetching messages for channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get replies to a thread
   * 
   * @param channelId The ID of the channel
   * @param threadTs The timestamp of the parent message
   * @returns Array of message objects in the thread
   */
  async getThreadReplies(channelId: string, threadTs: string): Promise<SlackMessage[]> {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs
      });
      
      if (!result.ok || !result.messages) {
        throw new Error(`Failed to fetch thread replies: ${result.error || 'Unknown error'}`);
      }
      
      return result.messages as SlackMessage[];
    } catch (error) {
      logger.error(`Error fetching thread replies for ${threadTs} in channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Post a message to a channel
   * 
   * @param channelId The ID of the channel to post to
   * @param text The message text
   * @param threadTs Optional thread timestamp to reply to a thread
   * @returns The timestamp of the sent message
   */
  async postMessage(channelId: string, text: string, threadTs?: string): Promise<string> {
    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text,
        thread_ts: threadTs
      });
      
      if (!result.ok || !result.ts) {
        throw new Error(`Failed to post message: ${result.error || 'Unknown error'}`);
      }
      
      return result.ts;
    } catch (error) {
      logger.error('Error posting message:', error);
      throw error;
    }
  }

  /**
   * List all channels available to the bot
   * 
   * @returns Array of channel objects
   */
  async listChannels() {
    try {
      const result = await this.client.conversations.list({
        exclude_archived: true,
        types: 'public_channel'
      });
      return result.channels || [];
    } catch (error) {
      // 개발 환경에서는 API 오류를 로그만 남기고 빈 배열 반환
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Error listing channels (development environment):', error);
        return [];
      }
      // 프로덕션 환경에서는 정상적으로 오류 로깅 및 예외 발생
      logger.error('Error listing channels:', error);
      throw error;
    }
  }

  /**
   * Format a summary response with Slack markdown
   * 
   * @param topic The conversation topic
   * @param summary The summary text
   * @param actionItems Array of action items
   * @returns Formatted message text
   */
  formatSummaryResponse(topic: string, summary: string, actionItems: string[]): string {
    let response = `*Topic:* ${topic}\n\n*Summary:*\n${summary}\n\n`;
    
    if (actionItems && actionItems.length > 0) {
      response += `*Action Items:*\n`;
      actionItems.forEach((item, index) => {
        response += `${index + 1}. ${item}\n`;
      });
    }
    
    return response;
  }
} 