# Slack Summary Bot

A Slack bot that uses OpenAI's GPT-4 to summarize messages and extract action items from Slack channels and threads.

## Features

1. **Summarize today's messages across Slack channels**
   - Use the `/summary-today #channel` slash command to summarize all messages in a channel from today
   - The bot fetches messages, generates a summary, and posts it to the channel

2. **Summarize thread conversations**
   - Use the "Summarize this thread" message shortcut on any message
   - The bot generates a concise summary of the entire thread and posts it as a reply

3. **Extract action items**
   - Automatically identifies and extracts to-do items and action points from conversations
   - Presents them in a clear, readable format

## Prerequisites

- Node.js 22 or higher
- npm or yarn
- A Slack workspace with admin privileges
- OpenAI API key

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/slack-summary.git
cd slack-summary
```

### 2. Install dependencies

```bash
cd functions
npm install
```

### 3. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
2. Choose "From scratch"
3. Name your app (e.g., "Summary Bot") and select your workspace
4. Under "Basic Information", note your "Signing Secret"
5. Under "OAuth & Permissions":
   - Add the following Bot Token Scopes:
     - `channels:history`
     - `channels:read`
     - `chat:write`
     - `commands`
     - `groups:history`
     - `groups:read`
     - `im:history`
     - `im:read`
     - `mpim:history`
     - `mpim:read`
   - Install the app to your workspace
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)
6. Under "Slash Commands":
   - Create a new command:
     - Command: `/summary-today`
     - Short Description: "Summarize today's messages in a channel"
     - Usage Hint: "#channel"
     - Request URL: `https://slackevents-5hwpwaphqa-uc.a.run.app/slack/events` (update with your actual URL)
     - Escape channels, users, and links: Checked
7. Under "Interactivity & Shortcuts":
   - Turn on Interactivity
   - Set Request URL to: `https://slackevents-5hwpwaphqa-uc.a.run.app/slack/events` (update with your actual URL)
   - Add a message shortcut:
     - Name: "Summarize this thread"
     - Short Description: "Generate a summary of this thread"
     - Callback ID: `summarize_thread`

8. Under "Event Subscriptions":
   - Enable Events
   - Set Request URL to: `https://slackevents-5hwpwaphqa-uc.a.run.app/slack/events` (update with your actual URL)

### 4. Set up OpenAI API access

1. Create an account on [OpenAI's platform](https://platform.openai.com/) if you don't have one
2. Navigate to the [API Keys section](https://platform.openai.com/api-keys) in your account
3. Click "Create new secret key"
4. Give your key a name (e.g., "Slack Summary Bot") and click "Create"
5. Copy the API key immediately (it starts with "sk-") as you won't be able to see it again
6. Make sure you have sufficient credits or a paid subscription to use the API
7. Note that this application uses GPT-4o by default. If you want to use a different model:
   - Open `functions/src/services/openai.service.ts`
   - Find the model parameter and change it to your preferred model (e.g., "gpt-3.5-turbo")

### 5. Configure Firebase and Environment variables

1. Install Firebase CLI if you haven't already:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project (if not already done):
```bash
firebase init
```
   - Select "Functions" when prompted for features
   - Choose an existing project or create a new one
   - Select TypeScript 
   - Say "Yes" to ESLint
   - Say "Yes" to installing dependencies

4. Set up environment variables using Firebase Secrets:
```bash
cd functions
npm run setup-env
```
   - This interactive script will guide you through setting up:
     - SLACK_BOT_TOKEN
     - SLACK_SIGNING_SECRET
     - OPENAI_API_KEY
     - DEFAULT_SUMMARY_CHANNEL

   - Alternatively, you can set these secrets manually:
```bash
firebase functions:secrets:set SLACK_BOT_TOKEN
firebase functions:secrets:set SLACK_SIGNING_SECRET
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set DEFAULT_SUMMARY_CHANNEL
```

### 6. Build and Deploy

Build and deploy to Firebase:
```bash
cd functions
npm run build
npm run deploy:prod
```

After deployment, Firebase will provide a function URL (e.g., `https://slackevents-5hwpwaphqa-uc.a.run.app`). Use this URL to update your Slack app configuration as mentioned in step 3.

## Usage

### Summarize a channel's messages from today

```
/summary-today #channel-name
```

If you don't specify a channel, it will summarize the current channel.

### Summarize a thread

1. Click the "..." (more actions) menu on any message
2. Select "Summarize this thread"
3. The summary will be posted as a reply in the thread

### Important Notes

1. Make sure the bot is invited to any channel you want to summarize. Use `/invite @YourBotName` in the channel.

2. If you receive a "not_in_channel" error, it means the bot needs to be invited to that channel.

3. If you see an error about OpenAI API quota or rate limits, check your API key settings and billing.

## Troubleshooting

- **Configuration Error**: Make sure all Firebase secrets are properly set
- **Bot Not Responding**: Verify the URL settings in your Slack app configuration
- **API Errors**: Check logs using `firebase functions:log`

## Configuration Options

You can modify the summary behavior by editing `functions/src/services/openai.service.ts`. The default model is set to GPT-4o.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 
