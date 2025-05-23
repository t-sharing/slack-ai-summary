import { App } from '@slack/bolt';
import { SlackService } from '../services/slack.service';
import { OpenAIService } from '../services/openai.service';
import * as logger from 'firebase-functions/logger';

export const registerCommands = (
  app: App,
  slackService: SlackService,
  openaiService: OpenAIService,
  defaultSummaryChannel: string
) => {
  /**
   * Command: /summary-today #channel
   * Summarizes all messages created today in the specified channel
   */
  app.command('/summary-today', async ({ command, ack, respond, client }) => {
    await ack();
    
    try {
      logger.info('Received /summary-today command', { command });
      
      let targetChannel = command.text.trim();
      
      // If no channel is specified, use the channel where the command was issued
      if (!targetChannel) {
        targetChannel = command.channel_id;
        logger.info('Using current channel as target', { targetChannel });
      } else {
        // Strip # if present and find the channel ID
        if (targetChannel.startsWith('#')) {
          targetChannel = targetChannel.substring(1);
        }
        
        // Try to find the channel ID if a name was provided
        if (!targetChannel.startsWith('C')) {
          logger.info('Looking up channel by name', { channelName: targetChannel });
          const channels = await slackService.listChannels();
          const channel = channels.find((c: any) => c.name === targetChannel);
          
          if (!channel) {
            logger.warn('Channel not found', { channelName: targetChannel });
            await respond({
              text: `Channel #${targetChannel} not found. Please provide a valid channel name or ID.`,
              response_type: 'ephemeral'
            });
            return;
          }
          
          targetChannel = channel.id || '';
          logger.info('Found channel ID', { channelName: targetChannel, channelId: targetChannel });
        }
      }
      
      // Send loading message
      logger.info('Sending loading message');
      await respond({
        text: `:hourglass: Fetching today's messages and generating summary...`,
        response_type: 'ephemeral'
      });
      
      // Get today's messages from the channel
      logger.info('Fetching messages from channel', { channelId: targetChannel });
      const messages = await slackService.getTodayMessages(targetChannel);
      
      if (messages.length === 0) {
        logger.info('No messages found in channel', { channelId: targetChannel });
        await respond({
          text: `No messages found in the channel for today.`,
          response_type: 'ephemeral'
        });
        return;
      }
      
      logger.info('Retrieved messages', { count: messages.length });
      
      // Get channel name for better message formatting
      const channelInfo = await client.conversations.info({
        channel: targetChannel
      });
      
      const channelName = channelInfo.channel?.name || targetChannel;
      logger.info('Retrieved channel info', { channelName });
      
      // Extract message texts and filter out empty ones
      const messageTexts = messages.map(msg => msg.text).filter(Boolean) as string[];
      
      // Generate summary
      logger.info('Generating summary with OpenAI', { messageCount: messageTexts.length });
      const { summary, actionItems } = await openaiService.generateSummary(messageTexts);
      logger.info('Summary generated successfully');
      
      // Format and post the summary
      const formattedSummary = slackService.formatSummaryResponse(summary, actionItems);
      const summaryHeader = `*Summary of today's messages in #${channelName}*\n\n`;
      
      // Post the summary in the target channel (not the channel where command was executed)
      logger.info('Posting summary to channel', { channelId: targetChannel });
      await slackService.postMessage(targetChannel, summaryHeader + formattedSummary);
      
      // Notify the user
      logger.info('Notifying user of successful summary');
      await respond({
        text: `:white_check_mark: Summary generated and posted to #${channelName}.`,
        response_type: 'ephemeral'
      });
    } catch (error) {
      logger.error('Error handling /summary-today command:', error);
      await respond({
        text: `An error occurred while generating the summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        response_type: 'ephemeral'
      });
    }
  });
}; 