/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { Request, Response } from 'express';
import { App, ExpressReceiver } from '@slack/bolt';
import { SlackService } from './services/slack.service';
import { OpenAIService } from './services/openai.service';
import { registerCommands } from './routes/commands';
import express from 'express';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Get environment variables directly
const config = {
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || '',
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEFAULT_SUMMARY_CHANNEL: process.env.DEFAULT_SUMMARY_CHANNEL || 'general'
};

// Log configuration status
logger.info('Initializing with configuration', {
  hasSigningSecret: !!config.SLACK_SIGNING_SECRET,
  hasBotToken: !!config.SLACK_BOT_TOKEN,
  hasOpenAIKey: !!config.OPENAI_API_KEY,
  defaultSummaryChannel: config.DEFAULT_SUMMARY_CHANNEL
});

// 기존 오류 로깅 코드를 조건부 로깅으로 변경
// 실행 환경이 "production"일 때만 오류를 표시하도록 수정
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction && (!config.SLACK_SIGNING_SECRET || !config.SLACK_BOT_TOKEN || !config.OPENAI_API_KEY)) {
  logger.debug('=== CONFIGURATION NOTICE ===');
  logger.debug('Some configuration values are missing in development environment.');
  logger.debug('For production deployment, please ensure these values are set with:');
  logger.debug('firebase functions:secrets:set SLACK_SIGNING_SECRET');
  logger.debug('firebase functions:secrets:set SLACK_BOT_TOKEN');
  logger.debug('firebase functions:secrets:set OPENAI_API_KEY');
  logger.debug('Or use our setup script: npm run setup-env');
  logger.debug('============================');
}

// Create services
const slackService = new SlackService(config.SLACK_BOT_TOKEN);
const openaiService = new OpenAIService(config.OPENAI_API_KEY);

// Create Express app for the main function
const mainApp = express();

// Middleware for logging
mainApp.use((req, res, next) => {
  logger.info('Received request', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: JSON.stringify(req.body, null, 2)
  });
  next();
});

// Handle root endpoint requests - particularly for Slack URL verification
mainApp.post('/', (req, res) => {
  if (req.body && req.body.type === 'url_verification') {
    logger.info('Received challenge verification at root endpoint', { challenge: req.body.challenge });
    res.setHeader('Content-Type', 'text/plain');
    res.send(req.body.challenge);
    return;
  }
  
  // For any other root POST requests, forward to Bolt app
  // This allows the app to receive events properly
  logger.info('Forwarding request to Bolt app');
  res.redirect(307, '/slack/events');
});

// Simple GET endpoint for testing
mainApp.get('/', (req: Request, res: Response) => {
  logger.info('Received GET request at root');
  res.status(200).send('Slack Summary Bot is running!');
});

// Add a test endpoint for OpenAI
mainApp.get('/test-openai', async (req: Request, res: Response) => {
  try {
    logger.info('Testing OpenAI connection');
    
    // 테스트용 메시지
    const testMessages = [
      "안녕하세요, 이것은 테스트 메시지입니다.",
      "이 메시지가 요약되는지 확인해보세요.",
      "OpenAI 연동이 제대로 작동하는지 테스트합니다."
    ];
    
    // OpenAI 서비스 호출
    const result = await openaiService.generateSummary(testMessages);
    
    // 결과 반환
    res.status(200).json({
      success: true,
      result: result,
      config: {
        hasOpenAIKey: !!config.OPENAI_API_KEY,
        keyFirstChars: config.OPENAI_API_KEY ? config.OPENAI_API_KEY.substring(0, 5) + '...' : 'None'
      }
    });
  } catch (error) {
    logger.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        hasOpenAIKey: !!config.OPENAI_API_KEY,
        keyFirstChars: config.OPENAI_API_KEY ? config.OPENAI_API_KEY.substring(0, 5) + '...' : 'None'
      }
    });
  }
});

// Create Express receiver for Slack events with a custom endpoint path
const receiver = new ExpressReceiver({
  signingSecret: config.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  endpoints: '/slack/events'  // Set a specific endpoint path
});

// Create Slack app
const app = new App({
  token: config.SLACK_BOT_TOKEN,
  receiver
});

// Register command handlers
registerCommands(app, slackService, openaiService, config.DEFAULT_SUMMARY_CHANNEL);

// For Slack URL verification challenge on the Bolt endpoint
receiver.router.use((req, res, next) => {
  if (req.body && req.body.type === 'url_verification') {
    logger.info('Received challenge verification at Bolt endpoint', { challenge: req.body.challenge });
    res.setHeader('Content-Type', 'text/plain');
    res.send(req.body.challenge);
    return;
  }
  next();
});

// Mount the Bolt receiver's router to the main app
mainApp.use(receiver.router);

// Export the Express app as a Firebase Cloud Function
export const slackEvents = onRequest({
  cors: true,
  region: ['us-central1'],
  secrets: [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'OPENAI_API_KEY',
    'DEFAULT_SUMMARY_CHANNEL'
  ]
}, mainApp);
