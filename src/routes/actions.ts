import { App } from '@slack/bolt';
import { SlackService } from '../services/slack.service';
import { OpenAIService } from '../services/openai.service';
import * as logger from 'firebase-functions/logger';

// Define the correct type for our message shortcut payload
interface MessageShortcutPayload {
  type: 'message_action';
  callback_id: string;
  user: { id: string };
  message: {
    ts: string;
    text?: string;
    thread_ts?: string;
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
        logger.error('This shortcut must be used on a message.');
        return;
      }
      
      // Cast to our known payload type
      const messageShortcut = shortcut as unknown as MessageShortcutPayload;
      const channelId = messageShortcut.channel.id;
      const messageTs = messageShortcut.message.ts;
      const userId = messageShortcut.user.id;
      
      logger.info('Processing summarize request', {
        channelId,
        messageTs,
        userId,
        hasThreadTs: !!messageShortcut.message.thread_ts
      });
      
      // Determine if the message is part of a thread
      // If thread_ts exists, the message is a reply in a thread
      // If thread_ts doesn't exist but the message has replies, it's a parent message
      let messagesToSummarize: string[] = [];
      let summaryTitle = '';
      let replyThreadTs: string | undefined;
      
      try {
        // Check if the message is part of a thread (either as the parent or a reply)
        if (messageShortcut.message.thread_ts) {
          // Case 1: Message is a reply in a thread
          // Get all messages in the thread based on the thread_ts
          logger.info('Message is a reply in a thread', { threadTs: messageShortcut.message.thread_ts });
          const threadMessages = await slackService.getThreadReplies(channelId, messageShortcut.message.thread_ts);
          
          if (threadMessages && threadMessages.length > 0) {
            messagesToSummarize = threadMessages.map(msg => msg.text).filter(Boolean) as string[];
            summaryTitle = '*Thread Summary*\n\n';
            replyThreadTs = messageShortcut.message.thread_ts;
          } else {
            throw new Error('Could not fetch thread messages');
          }
        } else {
          // Try to get thread replies to see if this is a parent message with replies
          const threadMessages = await slackService.getThreadReplies(channelId, messageTs);
          
          if (threadMessages && threadMessages.length > 1) {
            // Case 2: Message is a parent message with replies
            logger.info('Message is a parent with replies', { messageTs, replyCount: threadMessages.length - 1 });
            messagesToSummarize = threadMessages.map(msg => msg.text).filter(Boolean) as string[];
            summaryTitle = '*Thread Summary*\n\n';
            replyThreadTs = messageTs;
          } else {
            // Case 3: Message is a standalone message (no thread)
            logger.info('Message is a standalone message', { messageTs });
            // Include just this single message for summarization
            if (messageShortcut.message.text) {
              messagesToSummarize = [messageShortcut.message.text];
              summaryTitle = '*Message Summary*\n\n';
              replyThreadTs = messageTs; // Reply to the message itself
            } else {
              // Try to fetch the message content if not available in the payload
              try {
                // Use conversations.history to get the message by its timestamp
                const result = await client.conversations.history({
                  channel: channelId,
                  latest: messageTs,
                  inclusive: true,
                  limit: 1
                });
                
                if (result.ok && result.messages && result.messages.length > 0) {
                  const messageText = result.messages[0].text;
                  if (messageText) {
                    messagesToSummarize = [messageText];
                    summaryTitle = '*Message Summary*\n\n';
                    replyThreadTs = messageTs; // Reply to the message itself
                  } else {
                    throw new Error('Message has no text content');
                  }
                } else {
                  throw new Error('Could not find the message');
                }
              } catch (historyError) {
                logger.error('Error fetching message history:', historyError);
                throw new Error('Failed to retrieve message content');
              }
            }
          }
        }
      } catch (messageProcessingError) {
        logger.error('Error processing message:', messageProcessingError);
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: `Error processing message: ${messageProcessingError instanceof Error ? messageProcessingError.message : 'Unknown error'}`
        });
        return;
      }
      
      // Check if we have any messages to summarize
      if (messagesToSummarize.length === 0) {
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: 'No message content found to summarize.'
        });
        return;
      }
      
      logger.info('Generating summary', { messageCount: messagesToSummarize.length });
      
      try {
        // Generate summary
        const { summary, actionItems } = await openaiService.generateSummary(messagesToSummarize);
        
        // Format and post the summary
        const formattedSummary = slackService.formatSummaryResponse(summary, actionItems);
        
        await slackService.postMessage(channelId, summaryTitle + formattedSummary, replyThreadTs);
        
        // Notify the user with an ephemeral message
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: ':white_check_mark: Summary has been posted as a reply.'
        });
      } catch (summaryError) {
        logger.error('Error generating or posting summary:', summaryError);
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: `Error generating summary: ${summaryError instanceof Error ? summaryError.message : 'Unknown error'}`
        });
      }
    } catch (error) {
      logger.error('Error handling summarize_thread shortcut:', error);
      
      // Send error to the user
      try {
        if (shortcut.type === 'message_action') {
          const messageShortcut = shortcut as unknown as MessageShortcutPayload;
          await client.chat.postEphemeral({
            channel: messageShortcut.channel.id,
            user: messageShortcut.user.id,
            text: `An error occurred while summarizing: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      } catch (e) {
        logger.error('Failed to send error notification:', e);
      }
    }
  });
}; 