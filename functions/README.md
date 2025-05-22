# Slack Summary Bot - Firebase Function

This Firebase Function hosts a Slack bot that generates summaries of channel messages using OpenAI's GPT.

## Setup Instructions

### Prerequisites
- Node.js and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created
- Slack App created with appropriate permissions
- OpenAI API key

### Configuration

#### Option 1: Using the Setup Helper Script (Recommended)
We've created a helper script to make setting up your environment variables easy and secure:

1. Make sure you're logged in to Firebase CLI:
   ```
   firebase login
   ```

2. Run the setup script:
   ```
   npm run setup-env
   ```

3. Follow the prompts to enter your credentials.

#### Option 2: Manual Configuration
If you prefer to set up manually, use these Firebase CLI commands:

```bash
# Set Slack credentials
firebase functions:config:set slack.bot_token="xoxb-your-bot-token"
firebase functions:config:set slack.signing_secret="your-slack-signing-secret"
firebase functions:config:set slack.default_channel="general"

# Set OpenAI API key
firebase functions:config:set openai.api_key="your-openai-api-key"

# Deploy your function
firebase deploy --only functions
```

### Verify Configuration
You can verify your environment variables with:
```
firebase functions:config:get
```

## Development

### Local Development
For local development, you can use:
```
npm run serve
```

This starts the Firebase emulator, allowing you to test your function locally.

### Logs
To view the Firebase function logs:
```
npm run logs
```

## Troubleshooting

### Environment Variables Not Loading
If your function is running but environment variables aren't loading:

1. Verify they are set correctly:
   ```
   firebase functions:config:get
   ```

2. Redeploy your function:
   ```
   firebase deploy --only functions
   ```

3. Check logs for any "Missing essential configuration" errors:
   ```
   npm run logs
   ```

### Slack URL Verification Issues
If Slack's URL verification challenge is failing, ensure your function is correctly handling the challenge response as implemented in the code.

## Security Notes

- Never hardcode API keys or tokens in your code
- Always use Firebase environment variables for sensitive credentials
- Be careful not to commit any files containing secrets to version control 