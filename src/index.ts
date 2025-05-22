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
import * as functions from 'firebase-functions';

// Get environment variables from Firebase config or process.env
const getConfig = () => {
  try {
    // Try to get config from Firebase
    const config = functions.config();
    logger.info('Using Firebase config', { 
      hasSlackConfig: !!config.slack, 
      hasOpenaiConfig: !!config.openai 
    });
    return {
      SLACK_SIGNING_SECRET: config.slack?.signing_secret || process.env.SLACK_SIGNING_SECRET || '',
      SLACK_BOT_TOKEN: config.slack?.bot_token || process.env.SLACK_BOT_TOKEN || '',
      OPENAI_API_KEY: config.openai?.api_key || process.env.OPENAI_API_KEY || '',
      DEFAULT_SUMMARY_CHANNEL: config.slack?.default_channel || process.env.DEFAULT_SUMMARY_CHANNEL || ''
    };
  } catch (error) {
    // Fallback to process.env if Firebase config fails
    logger.warn('Failed to get Firebase config, falling back to process.env', { error });
    return {
      SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || '',
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      DEFAULT_SUMMARY_CHANNEL: process.env.DEFAULT_SUMMARY_CHANNEL || ''
    };
  }
};

// Get configuration
const config = getConfig();

// Log configuration status
logger.info('Initializing with configuration', {
  hasSigningSecret: !!config.SLACK_SIGNING_SECRET,
  hasBotToken: !!config.SLACK_BOT_TOKEN,
  hasOpenAIKey: !!config.OPENAI_API_KEY,
  defaultSummaryChannel: config.DEFAULT_SUMMARY_CHANNEL || 'Not set'
});

// Create services
const slackService = new SlackService(config.SLACK_BOT_TOKEN);
const openaiService = new OpenAIService(config.OPENAI_API_KEY);

// Create Express receiver for Slack events
const receiver = new ExpressReceiver({
  signingSecret: config.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// Create Slack app
const app = new App({
  token: config.SLACK_BOT_TOKEN,
  receiver
});

// Register command handlers
registerCommands(app, slackService, openaiService, config.DEFAULT_SUMMARY_CHANNEL);

// For Slack URL verification challenge
receiver.router.use((req, res, next) => {
  if (req.body && req.body.type === 'url_verification') {
    logger.info('Received challenge verification', { challenge: req.body.challenge });
    res.setHeader('Content-Type', 'text/plain');
    res.send(req.body.challenge);
    return;
  }
  next();
});

// Middleware for logging
receiver.router.use((req, res, next) => {
  logger.info('Received request', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: JSON.stringify(req.body, null, 2)
  });
  next();
});

// Simple GET endpoint for testing
receiver.router.get('/', (req: Request, res: Response) => {
  logger.info('Received GET request');
  res.status(200).send('Slack Summary Bot is running!');
});

// Export the Slack app as a Firebase Cloud Function
export const slackEvents = onRequest({
  cors: true,
  region: ['us-central1']
}, receiver.app); 