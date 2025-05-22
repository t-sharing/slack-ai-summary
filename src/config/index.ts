import dotenv from 'dotenv';
import { SlackConfig, OpenAIConfig } from './types';

// Load environment variables
dotenv.config();

export const slackConfig: SlackConfig = {
  token: process.env.SLACK_BOT_TOKEN || '',
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  defaultSummaryChannel: process.env.DEFAULT_SUMMARY_CHANNEL || '',
  port: parseInt(process.env.APP_PORT || '3000', 10)
};

export const openaiConfig: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || ''
};

// Validate required environment variables
export const validateConfig = (): boolean => {
  const requiredEnvVars = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'OPENAI_API_KEY'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    envVar => !process.env[envVar]
  );
  
  if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    return false;
  }
  
  return true;
}; 