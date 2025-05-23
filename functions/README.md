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

### Code Architecture

The codebase follows a modular architecture for better maintainability:

```
src/
├── interfaces/           # TypeScript interfaces
│   └── slack-interfaces.ts
├── routes/               # Request handlers
│   ├── actions.ts        # Shortcut and interactive handlers
│   └── commands.ts       # Slash command handlers
├── services/             # Core business logic
│   ├── openai.service.ts # OpenAI API integration
│   └── slack.service.ts  # Slack API integration
├── utils/                # Shared utilities
│   ├── error-handler.ts  # Error handling utilities
│   └── message-utils.ts  # Message processing utilities
└── index.ts              # Main entry point
```

#### Key Design Principles

1. **Separation of Concerns**:
   - Services handle external API interactions
   - Routes manage request handling and flow control
   - Utilities provide reusable helper functions

2. **Error Handling Strategy**:
   - Centralized error formatting in `error-handler.ts`
   - Consistent error logging across all components
   - User-friendly error messages with specific guidance

3. **Code Reusability**:
   - Common patterns extracted to utility functions
   - Shared interfaces for type consistency
   - Standardized API result validation

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

## Security and Access Control

The bot follows strict security and access control principles:

### Channel Access

- The bot can only access channels (public or private) it has been explicitly invited to
- The bot cannot read messages in any channel without proper invitation
- The `conversations.list` API call is restricted to only list public channels

### Error Handling

- Access denied errors (e.g., "not_in_channel") are properly caught and presented to users
- The bot prompts users to invite it to channels when permission is missing
- All API calls include proper error handling for permission issues

### Data Protection

- Message data is only temporarily processed and not persistently stored
- API tokens and secrets are securely managed through Firebase Secret Manager
- Summarization requests are limited to channels the requesting user already has access to
- All communication with OpenAI's API uses secure HTTPS connections
- No conversation history is maintained between summarization requests
- User information is only used for timezone detection and is never shared with third parties

## Contributing

Contributions to improve security, performance, or add features are welcome. Please ensure any changes maintain the security and privacy principles outlined above.

## License

This project is licensed under the terms specified in the root-level README.