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
    logger.info('Initializing Slack service', { tokenProvided: !!token });
    
    if (!token) {
      logger.error('Slack Bot Token is missing');
    }
    
    this.client = new WebClient(token);
  }

  /**
   * Get today's messages from a channel
   * 
   * @param channelId The ID of the channel to fetch messages from
   * @returns Array of message objects
   */
  async getTodayMessages(channelId: string): Promise<SlackMessage[]> {
    try {
      // Calculate today's start timestamp (midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oldest = (today.getTime() / 1000).toString();
      
      logger.info('Fetching messages since', { 
        timestamp: oldest, 
        date: today.toISOString(),
        channelId 
      });
      
      const result = await this.client.conversations.history({
        channel: channelId,
        oldest,
        limit: 1000 // Adjust as needed
      });
      
      const messages = (result.messages || []) as SlackMessage[];
      logger.info('Retrieved messages', { 
        count: messages.length,
        channelId,
        hasMore: result.has_more || false
      });
      
      return messages;
    } catch (error) {
      logger.error('Error getting channel messages:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        channelId
      });
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
      console.error(`Error fetching messages for channel ${channelId}:`, error);
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
      console.error(`Error fetching thread replies for ${threadTs} in channel ${channelId}:`, error);
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
      logger.info('Posting message to channel', { 
        channelId, 
        textLength: text.length,
        textPreview: text.substring(0, 50) + '...'
      });
      
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text,
        thread_ts: threadTs,
        mrkdwn: true
      });
      
      logger.info('Message posted successfully', { 
        timestamp: result.ts,
        channelId
      });
      
      if (!result.ok || !result.ts) {
        throw new Error(`Failed to post message: ${result.error || 'Unknown error'}`);
      }
      
      return result.ts;
    } catch (error) {
      logger.error('Error posting message:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        channelId
      });
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
      logger.info('Listing Slack channels');
      
      const result = await this.client.conversations.list({
        exclude_archived: true,
        types: 'public_channel'
      });
      
      const channels = result.channels || [];
      logger.info('Retrieved channels', { count: channels.length });
      
      return channels;
    } catch (error) {
      logger.error('Error listing channels:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Format a summary response with Slack markdown
   * 
   * @param summary The summary text
   * @param actionItems Array of action items
   * @returns Formatted message text
   */
  formatSummaryResponse(summary: string, actionItems: string[]): string {
    logger.info('Formatting summary response', { 
      summaryLength: summary.length, 
      actionItemCount: actionItems.length 
    });
    
    let response = `*Summary:*\n${summary}\n\n`;
    
    if (actionItems && actionItems.length > 0) {
      response += `*Action Items:*\n`;
      actionItems.forEach((item, index) => {
        response += `${index + 1}. ${item}\n`;
      });
    }
    
    return response;
  }
} 