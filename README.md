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

- Node.js 16 or higher
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
     - Escape channels, users, and links: Checked
7. Under "Interactivity & Shortcuts":
   - Turn on Interactivity
   - Add a message shortcut:
     - Name: "Summarize this thread"
     - Short Description: "Generate a summary of this thread"
     - Callback ID: `summarize_thread`

### 4. Set up OpenAI API access

1. Create an account on [OpenAI's platform](https://platform.openai.com/) if you don't have one
2. Navigate to the [API Keys section](https://platform.openai.com/api-keys) in your account
3. Click "Create new secret key"
4. Give your key a name (e.g., "Slack Summary Bot") and click "Create"
5. Copy the API key immediately (it starts with "sk-") as you won't be able to see it again
6. Make sure you have sufficient credits or a paid subscription to use the API
7. Note that this application uses GPT-4 by default. If you want to use a different model:
   - Open `src/services/openai.service.ts`
   - Find the model parameter and change it to your preferred model (e.g., "gpt-3.5-turbo")

### 5. Configure environment variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit the `.env` file with your credentials:
```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=your-openai-api-key
PORT=3000
DEFAULT_SUMMARY_CHANNEL=general
```

### 6. Build and run

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

### 7. Expose your local server (development)

For local development, use [ngrok](https://ngrok.com/) to create a public URL:

```bash
ngrok http 3000
```

Then update your Slack app configuration:
1. Go back to [https://api.slack.com/apps](https://api.slack.com/apps) and select your app
2. Under "Interactivity & Shortcuts":
   - Set the Request URL to `https://your-ngrok-url.ngrok.io/slack/events`
3. Under "Slash Commands":
   - Edit the `/summary-today` command
   - Set the Request URL to `https://your-ngrok-url.ngrok.io/slack/events`
   - Enable events
   - Set the Request URL to `https://your-ngrok-url.ngrok.io/slack/events`

### 8. Deploy to Firebase (Production)

1. Install Firebase CLI if you haven't already:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init
```
   - Select "Functions" when prompted for features
   - Choose an existing project or create a new one
   - Select JavaScript or TypeScript based on your project
   - Say "Yes" to ESLint
   - Say "Yes" to installing dependencies

4. Configure Firebase for your project:
   - Create a `firebase.json` file in the root directory:
```json
{
  "functions": {
    "source": ".",
    "runtime": "nodejs16"
  }
}
```
   - Update your `package.json` to include:
```json
"engines": {
  "node": "16"
},
"main": "dist/index.js",
```

5. Deploy to Firebase:
```bash
firebase deploy --only functions
```

6. After deployment, Firebase will provide a domain URL (e.g., `https://your-project-id.web.app` or `https://your-project-id.firebaseapp.com`)

7. Update your Slack app configuration with the Firebase domain:
   - Go to [https://api.slack.com/apps](https://api.slack.com/apps) and select your app
   - Under "Interactivity & Shortcuts":
     - Set the Request URL to `https://your-firebase-function-url/slack/events`
   - Under "Slash Commands":
     - Edit the `/summary-today` command
     - Set the Request URL to `https://your-firebase-function-url/slack/events`
   - Under "Event Subscriptions":
     - Enable events
     - Set the Request URL to `https://your-firebase-function-url/slack/events`
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

## Configuration Options

You can configure the summary length by modifying the code in `src/services/openai.service.ts`. Three options are available:
- `short`: 1-2 sentences
- `medium`: 3-5 sentences (default)
- `detailed`: Comprehensive summary

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 
