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
        
        logger.info('Processing summary request', {
          channelId,
          messageTs,
          userId,
          hasThreadTs: !!messageShortcut.message.thread_ts
        });
        
        // 로딩 메시지 전송 - 나중에 업데이트하기 위해 타임스탬프 저장
        const loadingMessage = await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: ':hourglass: Fetching messages and generating summary...'
        });
        
        // 로딩 메시지 타임스탬프 저장 (있는 경우)
        if (loadingMessage && loadingMessage.message_ts) {
          loadingMessageTs = loadingMessage.message_ts;
          logger.info('Sent loading message', { loadingMessageTs });
        }
        
        // 메시지 요약 대상 결정 변수
        let messagesToSummarize: string[] = [];
        let summaryTitle = '';
        let replyThreadTs: string | undefined;
        
        // 메시지가 스레드의 일부인지 확인 (부모 또는 답글)
        if (messageShortcut.message.thread_ts) {
          // 케이스 1: 메시지가 스레드 내 답글인 경우
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
          // 메시지가 스레드의 부모인지 확인
          const threadMessages = await slackService.getThreadReplies(channelId, messageTs);
          
          if (threadMessages && threadMessages.length > 1) {
            // 케이스 2: 메시지가 답글이 있는 부모 메시지인 경우
            logger.info('Message is a parent with replies', { messageTs, replyCount: threadMessages.length - 1 });
            messagesToSummarize = threadMessages.map(msg => msg.text).filter(Boolean) as string[];
            summaryTitle = '*Thread Summary*\n\n';
            replyThreadTs = messageTs;
          } else {
            // 케이스 3: 메시지가 독립 메시지인 경우 (스레드 없음)
            logger.info('Message is a standalone message', { messageTs });
            // 이 단일 메시지만 요약
            if (messageShortcut.message.text) {
              messagesToSummarize = [messageShortcut.message.text];
              summaryTitle = '*Message Summary*\n\n';
              replyThreadTs = messageTs; // 메시지 자체에 답글로 달기
            } else {
              // 페이로드에 메시지 텍스트가 없으면 직접 가져오기
              try {
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
                    replyThreadTs = messageTs;
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
        
        // 요약할 메시지가 있는지 확인
        if (messagesToSummarize.length === 0) {
          await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: 'No message content found to summarize.'
          });
          return;
        }
        
        logger.info('Generating summary', { messageCount: messagesToSummarize.length });
        
        // Generate summary
        const { topic, summary, actionItems } = await openaiService.generateSummary(messagesToSummarize);
        logger.info('Summary generated successfully');
        
        // Format and post the summary
        const formattedSummary = slackService.formatSummaryResponse(topic, summary, actionItems);
        
        // Post as a reply to the thread or message
        logger.info('Posting summary', { channelId, threadTs: replyThreadTs });
        await slackService.postMessage(channelId, summaryTitle + formattedSummary, replyThreadTs);
        
        // 로딩 메시지 대신 성공 메시지 전송
        logger.info('Sending success notification to user');
        await client.chat.postEphemeral({
          channel: channelId,
          user: userId,
          text: ':white_check_mark: Summary generated and posted as a reply.'
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
            let errorMessage = 'An error occurred while summarizing.';
            
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