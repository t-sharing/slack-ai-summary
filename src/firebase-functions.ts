/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// Slack events endpoint
export const slackEvents = onRequest({
  cors: true,
  region: ["us-central1"]
}, (request, response) => {
  logger.info("Received Slack event", {structuredData: true});
  
  // For Slack URL verification challenge
  if (request.body && request.body.challenge) {
    response.send(request.body.challenge);
    return;
  }
  
  // Here you would handle Slack events and commands
  // For now, just acknowledge receipt
  response.status(200).send("Event received");
});
