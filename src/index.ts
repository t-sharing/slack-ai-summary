import { App } from '@slack/bolt';
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

// Initialize Slack app
const app = new App({
  token: slackConfig.token,
  signingSecret: slackConfig.signingSecret,
  socketMode: false,
});

// Initialize services
const slackService = new SlackService(slackConfig.token);
const openaiService = new OpenAIService(openaiConfig.apiKey);

// Register commands and actions
registerCommands(app, slackService, openaiService, slackConfig.defaultSummaryChannel);
registerActions(app, slackService, openaiService);

// Start the app
(async () => {
  try {
    const port = slackConfig.port;
    await app.start(port);
    console.log(`⚡️ Slack Summary Bot is running on port ${port}!`);
    console.log('For local development, use ngrok to create a public URL:');
    console.log(`ngrok http ${port}`);
  } catch (error) {
    console.error('Error starting app:', error);
    process.exit(1);
  }
})(); 