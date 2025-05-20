import { WebClient } from '@slack/web-api';
import dayjs from 'dayjs';

export interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  thread_ts?: string;
}

export class SlackService {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  /**
   * Get today's messages from a channel
   * 
   * @param channelId The ID of the channel to fetch messages from
   * @returns Array of message objects
   */
  async getTodayMessages(channelId: string): Promise<SlackMessage[]> {
    const startOfDay = dayjs().startOf('day').unix();
    const now = dayjs().unix();
    
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        oldest: startOfDay.toString(),
        latest: now.toString(),
        limit: 1000 // Adjust as needed
      });
      
      if (!result.ok || !result.messages) {
        throw new Error(`Failed to fetch messages: ${result.error || 'Unknown error'}`);
      }
      
      return result.messages as SlackMessage[];
    } catch (error) {
      console.error(`Error fetching today's messages for channel ${channelId}:`, error);
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
      console.error(`Error posting message to channel ${channelId}:`, error);
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
        types: 'public_channel,private_channel'
      });
      
      if (!result.ok || !result.channels) {
        throw new Error(`Failed to list channels: ${result.error || 'Unknown error'}`);
      }
      
      return result.channels;
    } catch (error) {
      console.error('Error listing channels:', error);
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
    let formattedMessage = `*Daily Summary*\n\n${summary}\n\n`;
    
    if (actionItems.length > 0) {
      formattedMessage += '*Action Items:*\n';
      actionItems.forEach((item) => {
        formattedMessage += `• ${item}\n`;
      });
    }
    
    return formattedMessage;
  }
} 