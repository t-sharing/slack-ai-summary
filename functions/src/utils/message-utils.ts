import { SlackMessage } from '../interfaces/slack-interfaces';

/**
 * 메시지 배열에서 텍스트만 추출
 * 
 * @param messages Slack 메시지 배열
 * @returns 텍스트 배열
 */
export function extractMessageTexts(messages: SlackMessage[]): string[] {
  return messages
    .map(msg => msg.text)
    .filter(Boolean) as string[];
}

/**
 * 채널 이름을 ID 형식과 문자 형식 모두 지원하도록 포맷
 * 
 * @param channelInput 사용자 입력 채널 (ID 또는 이름)
 * @returns 처리된 채널 문자열
 */
export function formatChannelInput(channelInput: string): string {
  let formattedChannel = channelInput.trim();
  
  // Remove # prefix if present
  if (formattedChannel.startsWith('#')) {
    formattedChannel = formattedChannel.substring(1);
  }
  
  return formattedChannel;
}

/**
 * 채널 이름에 # 접두사 붙이기
 * 
 * @param channelName 채널 이름
 * @returns # 접두사가 붙은 채널 이름
 */
export function formatChannelName(channelName: string): string {
  return channelName.startsWith('#') ? channelName : `#${channelName}`;
}

/**
 * 요약 헤더 생성 (스레드 또는 메시지에 따라 다름)
 * 
 * @param isThread 스레드 여부
 * @returns 요약 헤더 텍스트
 */
export function getSummaryHeader(isThread: boolean): string {
  return isThread ? '*Thread Summary*\n\n' : '*Message Summary*\n\n';
}

/**
 * 채널 요약 헤더 생성
 * 
 * @param channelName 채널 이름
 * @returns 채널 요약 헤더 텍스트
 */
export function getChannelSummaryHeader(channelName: string): string {
  return `*Summary of today's messages in ${formatChannelName(channelName)}*\n\n`;
} 