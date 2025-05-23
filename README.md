# Slack Summary Bot

A Slack bot that uses OpenAI's GPT-4 to summarize messages and extract action items from Slack channels and threads.

## Recent Updates

- **2025-05-23**: Code refactoring - Improved code structure with utility functions and better error handling
- **2025-05-23**: Code cleanup - Removed unused DEFAULT_SUMMARY_CHANNEL environment variable and related code
- **2025-05-22**: Added timezone awareness to respect user's local timezone when determining "today's" messages
- **2025-05-21**: Added thread summarization with automatic detection of standalone messages vs. threads
- **2025-05-20**: Improved summary format with topic sections and more concise output

## Features

1. **Summarize today's messages across Slack channels**
   - Use the `/summary-today #channel` slash command to summarize all messages in a channel from today
   - The bot fetches messages based on the user's timezone, generating a summary and posting it to the channel

2. **Summarize thread conversations and individual messages**
   - Use the "Summarize this thread" message shortcut on any message
   - If the selected message is part of a thread (either as a parent or reply), the bot summarizes the entire thread
   - If the selected message is a standalone message with no replies, the bot summarizes just that message
   - The summary is posted as a reply to maintain context

3. **Concise Topic-based Summaries**
   - Each summary includes a clear topic that represents what the conversation is about
   - Summaries are brief and concise, focusing only on the key points
   - Formatted in a structured way for easy reading

4. **Extract action items**
   - Automatically identifies and extracts to-do items and action points from conversations
   - Presents them in a clear, readable format

5. **Timezone-aware Summarization**
   - Respects the user's timezone when determining "today's messages"
   - Ensures accurate summarization regardless of the user's geographic location

6. **Optimized for Slack's response requirements**
   - Implements fast acknowledgment pattern to prevent Slack timeout errors
   - Uses asynchronous processing for long-running tasks
   - Optimized memory and timeout settings for reliable performance

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
     - `users:read`
     - `users.profile:read` (Required for accessing user timezone information)
     - `users:read.email` (Optional, for more detailed user information)
   - Install the app to your workspace
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)
6. Under "Slash Commands":
   - Create a new command:
     - Command: `/summary-today`
     - Short Description: "Summarize today's messages in a channel"
     - Usage Hint: "#channel"
     - Request URL: `https://your-firebase-function-url/slack/events` (update with your actual URL)
     - Escape channels, users, and links: Checked
7. Under "Interactivity & Shortcuts":
   - Turn on Interactivity
   - Set Request URL to: `https://your-firebase-function-url/slack/events` (update with your actual URL)
   - Add a message shortcut:
     - Name: "Summarize this thread"
     - Short Description: "Generate a summary of this thread or message"
     - Callback ID: `summarize_thread`

8. Under "Event Subscriptions":
   - Enable Events
   - Set Request URL to: `https://your-firebase-function-url/slack/events` (update with your actual URL)

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

   - Alternatively, you can set these secrets manually:
```bash
firebase functions:secrets:set SLACK_BOT_TOKEN
firebase functions:secrets:set SLACK_SIGNING_SECRET
firebase functions:secrets:set OPENAI_API_KEY
```

### 6. Build and Deploy

Build and deploy to Firebase:
```bash
cd functions
npm run build
npm run deploy:prod
```

After deployment, Firebase will provide a function URL (e.g., `https://your-firebase-function-url`). Use this URL to update your Slack app configuration as mentioned in step 3.

## Usage

### Summarize a channel's messages from today

```
/summary-today #channel-name
```

If you don't specify a channel, it will summarize the current channel.

- The system uses your Slack timezone settings to determine what "today" means for you
- Messages are collected from midnight in your timezone until the current time

### Summarize a thread or message

1. Click the "..." (more actions) menu on any message
2. Select "Summarize this thread"
3. The bot will determine if the message is:
   - Part of a thread (either as parent or reply): It will summarize the entire thread
   - A standalone message: It will summarize just that message
4. The summary will be posted as a reply to maintain context

### Summary Format

Each summary includes:
- A clear topic that represents what the conversation is about
- A brief summary of the main discussion points (2-3 sentences)
- Action items listed with bullet points (if any)

### Important Notes

1. Make sure the bot is invited to any channel you want to summarize. Use `/invite @YourBotName` in the channel.

2. If you receive a "not_in_channel" error, it means the bot needs to be invited to that channel.

3. If you see an error about OpenAI API quota or rate limits, check your API key settings and billing.

4. The timezone feature requires the `users.profile:read` scope. If you see timezone-related issues, make sure this permission is granted to the bot.

## Security and Access Control

### Channel Access Restrictions

- **Public Channels**: The bot can only access public channels it has been invited to.
- **Private Channels**: The bot can only access private channels it has been explicitly invited to.
- **Permission Enforcement**: Slack's API automatically enforces these restrictions - the bot cannot access channels it hasn't been invited to.
- **Channel Listing**: The bot only lists public channels in its channel selection interface.

### User Permissions

- Users cannot use the bot to gain access to content in channels they don't have permission to view.
- The bot respects Slack's workspace permission structure and cannot bypass any access controls.
- Command access is limited to the channels where both the user and the bot have appropriate permissions.

### Data Privacy

- Messages are only sent to OpenAI for summarization when explicitly requested by a user.
- Summaries are only posted in the originating channel or thread, maintaining the privacy context of the original conversation.
- No message data is stored by the bot outside of temporary processing.

## Troubleshooting

- **Configuration Error**: Make sure all Firebase secrets are properly set
- **Bot Not Responding**: Verify the URL settings in your Slack app configuration
- **API Errors**: Check logs using `firebase functions:log`
- **Slack Timeout Errors**: The app is optimized to respond quickly to Slack's requests, but if you still see timeout errors, check the Firebase function logs for details
- **Timezone Issues**: Ensure the bot has the `users.profile:read` permission and verify your Slack profile has the correct timezone set

## Performance Optimizations

This bot implements several optimizations to ensure reliable performance with Slack's API:

1. **Fast Acknowledgment Pattern**: Immediately acknowledges Slack commands and shortcuts before processing
2. **Asynchronous Processing**: Uses background processing for time-consuming tasks
3. **Optimized Express Middleware**: Prioritizes URL verification requests
4. **Enhanced Firebase Function Settings**: 
   - Increased memory allocation (1GiB)
   - Extended timeout (120 seconds)
   - Maintains minimum instances for faster response
5. **Response Time Monitoring**: Logs request processing times for performance analysis

## Code Structure and Design

The project follows a modular architecture for better maintainability and extensibility:

### Core Components

1. **Service Layer**:
   - `SlackService`: Handles all Slack API interactions
   - `OpenAIService`: Manages communication with OpenAI for generating summaries

2. **Route Handlers**:
   - `commands.ts`: Processes slash commands like `/summary-today`
   - `actions.ts`: Handles message shortcuts and interactive components

3. **Utilities**:
   - `error-handler.ts`: Centralizes error handling and formatting
   - `message-utils.ts`: Provides helper functions for message processing

4. **Type Definitions**:
   - `slack-interfaces.ts`: Contains TypeScript interfaces for Slack API objects

### Error Handling

The application implements a robust error handling strategy:
- Standardized error messages for common issues
- Consistent logging format across all components
- User-friendly error messages with specific guidance
- Graceful fallbacks for API failures

### Extensibility

Adding new features is straightforward:
1. Define any new interfaces in the appropriate interface file
2. Add utility functions for reusable logic
3. Implement the feature in the relevant service
4. Connect it to the appropriate route handler

## Configuration Options

You can modify the summary behavior by editing `functions/src/services/openai.service.ts`. The default model is set to GPT-4o.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 
