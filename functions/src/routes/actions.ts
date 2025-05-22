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
    // 즉시 ack()를 호출하여 Slack의 3초 타임아웃을 방지 (아무 메시지 없이)
    await ack();
    
    // 비동기 처리를 위해 메인 로직을 별도 함수로 실행
    (async () => {
      // 로딩 메시지 추적을 위한 변수
      let loadingMessageTs: string | undefined;
      
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
        
        logger.info('Processing thread summary request', {
          channelId,
          messageTs,
          userId
        });
        
        // 로딩 메시지 전송 - 나중에 업데이트하기 위해 타임스탬프 저장
        const loadingMessage = await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: ':hourglass: Fetching thread messages and generating summary...'
        });
        
        // 로딩 메시지 타임스탬프 저장 (있는 경우)
        if (loadingMessage && loadingMessage.message_ts) {
          loadingMessageTs = loadingMessage.message_ts;
          logger.info('Sent loading message', { loadingMessageTs });
        }
        
        // Get all messages in the thread
        logger.info('Fetching thread replies', { channelId, messageTs });
        const messages = await slackService.getThreadReplies(channelId, messageTs);
        
        if (messages.length <= 1) {
          logger.info('Thread has no replies', { channelId, messageTs });
          // 로딩 메시지를 업데이트하는 대신 새 메시지 전송
          await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: 'This thread has no replies to summarize.'
          });
          return;
        }
        
        logger.info('Retrieved thread messages', { count: messages.length });
        
        // Extract message texts and filter out empty ones
        const messageTexts = messages.map(msg => msg.text).filter(Boolean) as string[];
        
        // Generate summary
        logger.info('Generating summary with OpenAI', { messageCount: messageTexts.length });
        const { summary, actionItems } = await openaiService.generateSummary(messageTexts);
        logger.info('Summary generated successfully');
        
        // Format and post the summary
        const formattedSummary = slackService.formatSummaryResponse(summary, actionItems);
        const summaryHeader = '*Thread Summary*\n\n';
        
        // Post as a reply to the thread
        logger.info('Posting summary to thread', { channelId, threadTs: messageTs });
        await slackService.postMessage(channelId, summaryHeader + formattedSummary, messageTs);
        
        // 로딩 메시지 대신 성공 메시지 전송
        logger.info('Sending success notification to user');
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: ':white_check_mark: Thread summary generated and posted as a reply.'
        });
      } catch (error) {
        logger.error('Error handling summarize_thread shortcut:', error);
        
        // Send error to the user
        try {
          if (shortcut.type === 'message_action') {
            const messageShortcut = shortcut as unknown as MessageShortcutPayload;
            const userId = messageShortcut.user.id;
            const channelId = messageShortcut.channel.id;
            
            // 오류의 종류에 따라 더 구체적인 메시지 제공
            let errorMessage = 'An error occurred while summarizing the thread.';
            
            if (error instanceof Error) {
              // OpenAI 관련 오류 체크
              if (error.message.includes('quota') || error.message.includes('rate limit')) {
                errorMessage = 'OpenAI API quota exceeded or rate limited. Please try again later or check your API key settings.';
              } 
              // Slack 채널 접근 권한 오류 체크
              else if (error.message.includes('not_in_channel')) {
                errorMessage = 'The bot is not in this channel. Please invite the bot to the channel first using `/invite @YourBotName`.';
              }
              // 그 외 오류는 간결하게 표시
              else {
                errorMessage = `Error: ${error.message}`;
              }
            }
            
            await client.chat.postEphemeral({
              channel: channelId,
              user: userId,
              text: errorMessage
            });
          }
        } catch (e) {
          logger.error('Failed to send error notification:', e);
        }
      }
    })();
  });
}; 