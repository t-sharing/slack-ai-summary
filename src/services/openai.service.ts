import OpenAI from 'openai';

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate a summary of the provided messages using GPT-4
   * 
   * @param messages Array of message texts to summarize
   * @param type Summary type: 'short', 'medium' or 'detailed'
   * @returns The generated summary
   */
  async generateSummary(messages: string[], type: 'short' | 'medium' | 'detailed' = 'medium'): Promise<{ summary: string; actionItems: string[] }> {
    if (!messages.length) {
      return {
        summary: 'No messages to summarize.',
        actionItems: []
      };
    }

    const lengthInstructions = {
      short: 'Provide a very concise summary in 1-2 sentences.',
      medium: 'Provide a moderate length summary in 3-5 sentences covering key topics.',
      detailed: 'Provide a comprehensive summary capturing all main discussion points and context.'
    };

    const prompt = `
      Summarize the following Slack conversation:
      ${messages.join('\n\n')}
      
      ${lengthInstructions[type]}
      
      After the summary, please extract and list any action items, to-dos, or commitments 
      made by participants in the format of a markdown checklist.
      
      Format your response as JSON with two fields:
      1. "summary": The text summary of the conversation
      2. "actionItems": An array of strings, each representing one action item
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes Slack conversations and extracts action items.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = completion.choices[0]?.message?.content || '{"summary":"Error generating summary.","actionItems":[]}';
      
      try {
        const parsedContent = JSON.parse(content);
        return {
          summary: parsedContent.summary || 'Error parsing summary.',
          actionItems: Array.isArray(parsedContent.actionItems) ? parsedContent.actionItems : []
        };
      } catch (e) {
        console.error('Error parsing OpenAI response:', e);
        return {
          summary: 'Error parsing the summary response.',
          actionItems: []
        };
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return {
        summary: 'Error generating summary. Please try again later.',
        actionItems: []
      };
    }
  }
} 