import { App, ExpressReceiver } from '@slack/bolt';
import * as functions from 'firebase-functions/v2';
import dotenv from 'dotenv';
import { SlackService } from './services/slack.service';
import { OpenAIService } from './services/openai.service';
import { registerCommands } from './routes/commands';
import { registerActions } from './routes/actions';
import { slackConfig, openaiConfig, validateConfig } from './config';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!validateConfig()) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Initialize Express receiver
const receiver = new ExpressReceiver({
  signingSecret: slackConfig.signingSecret,
  processBeforeResponse: true,
  // Do not include a required path prefix for requests - treat all requests as slash commands
  endpoints: '/'
});

// Initialize Slack app
const app = new App({
  token: slackConfig.token,
  receiver
});

// Initialize services
const slackService = new SlackService(slackConfig.token);
const openaiService = new OpenAIService(openaiConfig.apiKey);

// Register commands and actions
registerCommands(app, slackService, openaiService, slackConfig.defaultSummaryChannel);
registerActions(app, slackService, openaiService);

// Firebase Cloud Function for Slack events
export const slackEvents = functions.https.onRequest({
  cors: true,
  region: ["us-central1"]
}, (request, response) => {
  // Let the receiver handle the request
  receiver.app(request, response);
}); 