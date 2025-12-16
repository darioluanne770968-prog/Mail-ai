import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class OpenAIService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || config.openaiApiKey,
    });
    this.model = 'gpt-3.5-turbo';
  }

  async chat(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 1500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      logger.debug({
        msg: 'OpenAI request completed',
        model: this.model,
        duration: Date.now() - startTime,
        usage,
      });

      return { content, usage };
    } catch (error) {
      logger.error({ msg: 'OpenAI request failed', error });
      throw error;
    }
  }

  setModel(model: string) {
    this.model = model;
  }
}
