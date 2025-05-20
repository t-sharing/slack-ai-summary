import { App } from '@slack/bolt';
import { SlackService } from '../services/slack.service';
import { OpenAIService } from '../services/openai.service';

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
      let targetChannel = command.text.trim();
      
      // If no channel is specified, use the channel where the command was issued
      if (!targetChannel) {
        targetChannel = command.channel_id;
      } else {
        // Strip # if present and find the channel ID
        if (targetChannel.startsWith('#')) {
          targetChannel = targetChannel.substring(1);
        }
        
        // Try to find the channel ID if a name was provided
        if (!targetChannel.startsWith('C')) {
          const channels = await slackService.listChannels();
          const channel = channels.find((c: any) => c.name === targetChannel);
          
          if (!channel) {
            await respond({
              text: `Channel #${targetChannel} not found. Please provide a valid channel name or ID.`,
              response_type: 'ephemeral'
            });
            return;
          }
          
          targetChannel = channel.id || '';
        }
      }
      
      // Send loading message
      await respond({
        text: `:hourglass: Fetching today's messages and generating summary...`,
        response_type: 'ephemeral'
      });
      
      // Get today's messages from the channel
      const messages = await slackService.getTodayMessages(targetChannel);
      
      if (messages.length === 0) {
        await respond({
          text: `No messages found in the channel for today.`,
          response_type: 'ephemeral'
        });
        return;
      }
      
      // Get channel name for better message formatting
      const channelInfo = await client.conversations.info({
        channel: targetChannel
      });
      
      const channelName = channelInfo.channel?.name || targetChannel;
      
      // Extract message texts and filter out empty ones
      const messageTexts = messages.map(msg => msg.text).filter(Boolean) as string[];
      
      // Generate summary
      const { summary, actionItems } = await openaiService.generateSummary(messageTexts);
      
      // Format and post the summary
      const formattedSummary = slackService.formatSummaryResponse(summary, actionItems);
      const summaryHeader = `*Summary of today's messages in #${channelName}*\n\n`;
      
      await slackService.postMessage(command.channel_id, summaryHeader + formattedSummary);
      
      // Notify the user
      await respond({
        text: `:white_check_mark: Summary generated and posted to the channel.`,
        response_type: 'ephemeral'
      });
    } catch (error) {
      console.error('Error handling /summary-today command:', error);
      await respond({
        text: `An error occurred while generating the summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        response_type: 'ephemeral'
      });
    }
  });
}; 