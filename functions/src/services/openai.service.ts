import OpenAI from 'openai';
import * as logger from 'firebase-functions/logger';

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generates a summary of the provided messages using OpenAI
   */
  async generateSummary(messages: string[]): Promise<{ summary: string; actionItems: string[] }> {
    try {
      if (!messages || messages.length === 0) {
        return { summary: "No messages to summarize.", actionItems: [] };
      }
      
      // Combine all messages into a single text for the prompt
      const combinedMessages = messages.join('\n\n');
      logger.info('Generating summary for messages', { messageCount: messages.length });
      
      // Create the prompt for ChatGPT
      const prompt = `You are a helpful assistant that summarizes slack conversations.
Please analyze these Slack messages and provide:
1. A concise summary of the main discussion points and decisions
2. A list of action items or follow-ups mentioned

Here are the messages:
${combinedMessages}

Please respond in JSON format with two keys:
- "summary": a paragraph summarizing the discussion
- "actionItems": an array of strings, each being an action item`;
      
      // Call the OpenAI API
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",  // You can change this to a different model as needed
        messages: [
          { role: "system", content: "You are a helpful assistant that summarizes Slack conversations accurately and concisely." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      });
      
      // Extract the content from the response
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }
      
      // Parse the JSON response
      try {
        const parsedResponse = JSON.parse(content);
        return {
          summary: parsedResponse.summary || "No summary generated.",
          actionItems: Array.isArray(parsedResponse.actionItems) ? parsedResponse.actionItems : []
        };
      } catch (parseError) {
        logger.error('Error parsing OpenAI response', parseError);
        // If JSON parsing fails, return a default response
        return {
          summary: "Failed to parse the AI-generated summary.",
          actionItems: []
        };
      }
    } catch (error) {
      logger.error('Error generating summary with OpenAI:', error);
      throw error;
    }
  }
} 