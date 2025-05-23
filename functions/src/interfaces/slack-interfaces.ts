/**
 * Slack 메시지 기본 인터페이스
 */
export interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  [key: string]: any;
}

/**
 * 메시지 숏컷 페이로드 인터페이스
 */
export interface MessageShortcutPayload {
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

/**
 * 요약 결과 인터페이스
 */
export interface SummaryResult {
  topic: string;
  summary: string;
  actionItems: string[];
} 