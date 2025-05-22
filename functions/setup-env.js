#!/usr/bin/env node

/**
 * This script helps set up Firebase environment variables securely.
 * Run with: node setup-env.js
 */

const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// NODE_ENV 환경 변수 설정 (개발/테스트 환경에서 사용)
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log(`Environment: ${process.env.NODE_ENV}`);

// Ask for environment variables
console.log('===============================================');
console.log('🔐 Firebase Environment Variables Setup Helper');
console.log('===============================================');
console.log('This script will help you set up your Firebase environment variables securely.');
console.log('Your inputs will NEVER be saved to any file and will only be used to set Firebase secrets.\n');

// Function to execute a command and return a promise
const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

// Function to ask a question and return a promise
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Main async function
async function main() {
  try {
    // Check if Firebase CLI is installed
    try {
      await execCommand('firebase --version');
    } catch (error) {
      console.error('❌ Firebase CLI is not installed or not in your PATH.');
      console.error('Please install it with: npm install -g firebase-tools');
      process.exit(1);
    }

    // Collect variables
    console.log('Please enter your credentials:');
    const slackBotToken = await askQuestion('Slack Bot Token (xoxb-...): ');
    const slackSigningSecret = await askQuestion('Slack Signing Secret: ');
    const openaiApiKey = await askQuestion('OpenAI API Key: ');
    const defaultChannel = await askQuestion('Default Slack channel for summaries (default: general): ') || 'general';

    console.log('\nSetting Firebase environment variables...');
    
    // Set Firebase secrets
    try {
      // Set secrets using the new v2 secrets command
      await execCommand(`firebase functions:secrets:set SLACK_BOT_TOKEN`);
      console.log('Paste your Slack Bot Token when prompted and press Enter.');
      
      await execCommand(`firebase functions:secrets:set SLACK_SIGNING_SECRET`);
      console.log('Paste your Slack Signing Secret when prompted and press Enter.');
      
      await execCommand(`firebase functions:secrets:set OPENAI_API_KEY`);
      console.log('Paste your OpenAI API Key when prompted and press Enter.');
      
      await execCommand(`firebase functions:secrets:set DEFAULT_SUMMARY_CHANNEL`);
      console.log('Paste your Default Summary Channel when prompted and press Enter.');
      
      console.log('✅ Firebase environment variables set successfully!');
      
      // Ask if user wants to deploy now
      const deployNow = await askQuestion('\nDo you want to deploy your functions now? (y/n): ');
      if (deployNow.toLowerCase() === 'y') {
        console.log('\nDeploying functions...');
        await execCommand('firebase deploy --only functions');
        console.log('✅ Deployment completed!');
      } else {
        console.log('\nWhen you\'re ready, deploy your functions with:');
        console.log('  firebase deploy --only functions');
      }
    } catch (error) {
      console.error('❌ Error setting Firebase secrets:', error.message);
      console.error('Make sure you are logged in to Firebase CLI:');
      console.error('  firebase login');
    }
  } catch (error) {
    console.error('❌ An error occurred:', error.message);
  } finally {
    rl.close();
  }
}

// Run the main function
main(); 