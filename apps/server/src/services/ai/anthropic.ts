import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class AnthropicService {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || config.anthropicApiKey,
    });
    this.model = 'claude-3-sonnet-20240229';
  }

  async chat(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: params.maxTokens ?? 1500,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: params.userPrompt }],
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const usage = {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      };

      logger.debug({
        msg: 'Anthropic request completed',
        model: this.model,
        duration: Date.now() - startTime,
        usage,
      });

      return { content, usage };
    } catch (error) {
      logger.error({ msg: 'Anthropic request failed', error });
      throw error;
    }
  }

  setModel(model: string) {
    this.model = model;
  }
}
