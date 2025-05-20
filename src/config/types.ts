export interface SlackConfig {
  token: string;
  signingSecret: string;
  defaultSummaryChannel: string;
  port: number;
}

export interface OpenAIConfig {
  apiKey: string;
} 