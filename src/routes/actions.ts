import { App } from '@slack/bolt';
import { SlackService } from '../services/slack.service';
import { OpenAIService } from '../services/openai.service';

// Define the correct type for our message shortcut payload
interface MessageShortcutPayload {
  type: 'message_action';
  callback_id: string;
  user: { id: string };
  message: {
    ts: string;
    text?: string;
    channel?: { id: string };
  };
  channel: { id: string };
  response_url: string;
}

export const registerActions = (
  app: App,
  slackService: SlackService,
  openaiService: OpenAIService
) => {
  /**
   * Message shortcut: "Summarize this thread"
   * Available when right-clicking a message in Slack
   */
  app.shortcut('summarize_thread', async ({ shortcut, ack, client }) => {
    await ack();
    
    try {
      // Check if it's a message shortcut (not global)
      if (shortcut.type !== 'message_action') {
        console.error('This shortcut must be used on a message.');
        return;
      }
      
      // Cast to our known payload type
      const messageShortcut = shortcut as unknown as MessageShortcutPayload;
      const channelId = messageShortcut.channel.id;
      const messageTs = messageShortcut.message.ts;
      
      // Get all messages in the thread
      const messages = await slackService.getThreadReplies(channelId, messageTs);
      
      if (messages.length <= 1) {
        await client.chat.postEphemeral({
          channel: channelId,
          user: messageShortcut.user.id,
          text: 'This thread has no replies to summarize.'
        });
        return;
      }
      
      // Extract message texts and filter out empty ones
      const messageTexts = messages.map(msg => msg.text).filter(Boolean) as string[];
      
      // Generate summary
      const { summary, actionItems } = await openaiService.generateSummary(messageTexts, 'medium');
      
      // Format and post the summary
      const formattedSummary = slackService.formatSummaryResponse(summary, actionItems);
      const summaryHeader = '*Thread Summary*\n\n';
      
      await slackService.postMessage(channelId, summaryHeader + formattedSummary, messageTs);
    } catch (error) {
      console.error('Error handling summarize_thread shortcut:', error);
      
      // Send error to the user
      try {
        if (shortcut.type === 'message_action') {
          const messageShortcut = shortcut as unknown as MessageShortcutPayload;
          await client.chat.postEphemeral({
            channel: messageShortcut.channel.id,
            user: messageShortcut.user.id,
            text: `An error occurred while summarizing the thread: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      } catch (e) {
        console.error('Failed to send error notification:', e);
      }
    }
  });
}; 