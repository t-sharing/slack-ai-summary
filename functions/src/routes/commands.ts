import { App } from '@slack/bolt';
import { SlackService } from '../services/slack.service';
import { OpenAIService } from '../services/openai.service';
import * as logger from 'firebase-functions/logger';

export const registerCommands = (
  app: App,
  slackService: SlackService,
  openaiService: OpenAIService
) => {
  /**
   * Command: /summary-today #channel
   * Summarizes all messages created today in the specified channel
   */
  app.command('/summary-today', async ({ command, ack, respond, client }) => {
    // 즉시 ack()를 호출하여 Slack의 3초 타임아웃을 방지
    await ack();
    
    // 비동기 처리를 위해 메인 로직을 별도 함수로 실행 (이렇게 하면 ack() 이후 작업이 백그라운드에서 진행됨)
    // ack()가 반환된 후에도 함수는 계속 실행됨
    (async () => {
      let responseId: string | undefined;
      
      try {
        logger.info('Received /summary-today command', { command });
        
        // 명령어 처리 중임을 알리는 메시지 전송 (ack 이후에 실행)
        const loadingResponse = await respond({
          text: `:hourglass: Processing your request...`,
          response_type: 'ephemeral'
        });
        
        // Extract response ID if available
        if (loadingResponse && typeof loadingResponse === 'object' && 'message_ts' in loadingResponse) {
          responseId = (loadingResponse as any).message_ts;
          logger.info('Got response ID for loading message', { responseId });
        }
        
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
                response_type: 'ephemeral',
                replace_original: true
              });
              return;
            }
            
            targetChannel = channel.id || '';
            logger.info('Found channel ID', { channelName: targetChannel, channelId: targetChannel });
          }
        }
        
        // 로딩 메시지 업데이트
        logger.info('Updating loading message');
        await respond({
          text: `:hourglass: Fetching today's messages and generating summary...`,
          response_type: 'ephemeral',
          replace_original: true
        });
        
        // Get today's messages from the channel, using the user's timezone
        logger.info('Fetching messages from channel', { channelId: targetChannel, userId: command.user_id });
        const messages = await slackService.getTodayMessages(targetChannel, command.user_id);
        
        if (messages.length === 0) {
          logger.info('No messages found in channel', { channelId: targetChannel });
          await respond({
            text: `No messages found in the channel for today (based on your timezone).`,
            response_type: 'ephemeral',
            replace_original: true
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
        const { topic, summary, actionItems } = await openaiService.generateSummary(messageTexts);
        logger.info('Summary generated successfully');
        
        // Format and post the summary
        const formattedSummary = slackService.formatSummaryResponse(topic, summary, actionItems);
        const summaryHeader = `*Summary of today's messages in #${channelName}*\n\n`;
        
        // Post the summary in the channel
        logger.info('Posting summary to channel', { channelId: targetChannel });
        await slackService.postMessage(targetChannel, summaryHeader + formattedSummary);
        
        // Notify the user of success only after everything else has completed successfully
        logger.info('Notifying user of successful summary');
        await respond({
          text: `:white_check_mark: Summary generated and posted to #${channelName}.`,
          response_type: 'ephemeral',
          replace_original: true
        });
      } catch (error) {
        logger.error('Error handling /summary-today command:', error);
        
        // 오류의 종류에 따라 더 구체적인 메시지 제공
        let errorMessage = 'An error occurred while generating the summary.';
        
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
        
        try {
          // 기존 로딩 메시지가 있으면 이를 대체
          await respond({
            text: errorMessage,
            response_type: 'ephemeral',
            replace_original: true
          });
        } catch (respondError) {
          logger.error('Failed to send error message:', respondError);
          // 만약 respond 자체가 실패한 경우 fallback으로 채팅 메시지 전송
          try {
            await client.chat.postEphemeral({
              channel: command.channel_id,
              user: command.user_id,
              text: `${errorMessage} (Failed to update original message)`
            });
          } catch (finalError) {
            logger.error('All error notification attempts failed:', finalError);
          }
        }
      }
    })();
  });
}; 