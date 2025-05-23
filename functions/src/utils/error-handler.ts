import * as logger from 'firebase-functions/logger';

/**
 * 일반적인 오류를 사용자 친화적인 메시지로 변환
 * 
 * @param error 원본 오류 객체
 * @param defaultMessage 기본 오류 메시지
 * @returns 사용자 친화적인 오류 메시지
 */
export function formatErrorMessage(error: unknown, defaultMessage: string = 'An error occurred.'): string {
  let errorMessage = defaultMessage;
  
  if (error instanceof Error) {
    // OpenAI 관련 오류 체크
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      errorMessage = 'OpenAI API quota exceeded or rate limited. Please try again later or check your API key settings.';
    } 
    // Slack 채널 접근 권한 오류 체크
    else if (error.message.includes('not_in_channel')) {
      errorMessage = 'The bot is not in this channel. Please invite the bot to the channel first using `/invite @YourBotName`.';
    }
    // 인증 관련 오류
    else if (error.message.includes('not_authed') || error.message.includes('invalid_auth')) {
      errorMessage = 'Authentication failed. Please check the bot token or reinstall the app.';
    }
    // missing_scope 오류
    else if (error.message.includes('missing_scope')) {
      errorMessage = 'The bot is missing required permissions. Please reinstall the app with all required scopes.';
    }
    // 그 외 오류는 간결하게 표시
    else {
      errorMessage = `Error: ${error.message}`;
    }
  }
  
  return errorMessage;
}

/**
 * 오류를 로깅하고 포맷된 오류 메시지 반환
 * 
 * @param error 원본 오류 객체
 * @param context 오류 컨텍스트 정보
 * @param defaultMessage 기본 오류 메시지
 * @returns 사용자 친화적인 오류 메시지
 */
export function logAndFormatError(
  error: unknown, 
  context: Record<string, any>, 
  defaultMessage: string = 'An error occurred.'
): string {
  logger.error(context.errorSource || 'Error occurred:', {
    error,
    errorMessage: error instanceof Error ? error.message : 'Unknown error',
    ...context
  });
  
  return formatErrorMessage(error, defaultMessage);
}

/**
 * Slack API 결과를 검증
 * 
 * @param result Slack API 결과
 * @param errorMessage 오류 메시지
 * @throws Error API 결과가 유효하지 않은 경우
 */
export function validateSlackApiResult(result: any, errorMessage: string): void {
  if (!result.ok) {
    throw new Error(`${errorMessage}: ${result.error || 'Unknown error'}`);
  }
} 