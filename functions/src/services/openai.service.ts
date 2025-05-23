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
  async generateSummary(messages: string[]): Promise<{ topic: string; summary: string; actionItems: string[] }> {
    try {
      if (!messages || messages.length === 0) {
        return { topic: "No topic", summary: "No messages to summarize.", actionItems: [] };
      }
      
      // Combine all messages into a single text for the prompt
      const combinedMessages = messages.join('\n\n');
      logger.info('Generating summary for messages', { messageCount: messages.length });
      
      // Create the prompt for ChatGPT
      const prompt = `You are a helpful assistant that summarizes slack conversations.
Please analyze these Slack messages and provide:
1. A clear, concise topic that represents what this conversation is about (1-5 words)
2. A very brief summary of the main discussion points and decisions (2-3 sentences maximum)
3. A list of action items or follow-ups mentioned (if any)

Be extremely concise in the summary - focus only on the key points.

Here are the messages:
${combinedMessages}

Please respond in JSON format with these keys:
- "topic": a short phrase describing the main topic of discussion
- "summary": a very brief paragraph (2-3 sentences max) summarizing the key points
- "actionItems": an array of strings, each being an action item`;
      
      // Call the OpenAI API
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",  // You can change this to a different model as needed
        messages: [
          { role: "system", content: "You are a helpful assistant that summarizes Slack conversations very concisely, focusing on brevity and accuracy." },
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
          topic: parsedResponse.topic || "Discussion",
          summary: parsedResponse.summary || "No summary generated.",
          actionItems: Array.isArray(parsedResponse.actionItems) ? parsedResponse.actionItems : []
        };
      } catch (parseError) {
        logger.error('Error parsing OpenAI response', parseError);
        // If JSON parsing fails, return a default response
        return {
          topic: "Discussion",
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