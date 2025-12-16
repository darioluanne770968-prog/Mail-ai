import { OpenAIService } from './openai.js';
import { AnthropicService } from './anthropic.js';
import { REPLY_SYSTEM_PROMPT, buildReplyUserPrompt } from './prompts/reply.js';
import { COMPOSE_SYSTEM_PROMPT, buildComposeUserPrompt } from './prompts/compose.js';
import { SUMMARIZE_SYSTEM_PROMPT, buildSummarizeUserPrompt } from './prompts/summarize.js';
import { ANALYZE_SYSTEM_PROMPT, buildAnalyzeUserPrompt } from './prompts/analyze.js';
import { IMPROVE_SYSTEM_PROMPT, buildImproveUserPrompt } from './prompts/improve.js';
import { logger } from '../../utils/logger.js';

export type AIProvider = 'openai' | 'anthropic';

interface AIServiceOptions {
  provider: AIProvider;
  apiKey?: string;
}

export class AIService {
  private openai: OpenAIService;
  private anthropic: AnthropicService;
  private defaultProvider: AIProvider;

  constructor() {
    this.openai = new OpenAIService();
    this.anthropic = new AnthropicService();
    this.defaultProvider = 'openai';
  }

  private getService(options?: AIServiceOptions) {
    const provider = options?.provider || this.defaultProvider;

    if (provider === 'anthropic') {
      if (options?.apiKey) {
        return new AnthropicService(options.apiKey);
      }
      return this.anthropic;
    }

    if (options?.apiKey) {
      return new OpenAIService(options.apiKey);
    }
    return this.openai;
  }

  private parseJSON<T>(content: string): T {
    try {
      // Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (error) {
      logger.error({ msg: 'Failed to parse AI response as JSON', content, error });
      throw new Error('Failed to parse AI response');
    }
  }

  async generateReply(
    params: {
      emailContent: string;
      threadContext?: string;
      tone: string;
      length: string;
      language?: string;
    },
    options?: AIServiceOptions
  ) {
    const service = this.getService(options);
    const userPrompt = buildReplyUserPrompt(params);

    const { content, usage } = await service.chat({
      systemPrompt: REPLY_SYSTEM_PROMPT,
      userPrompt,
    });

    const result = this.parseJSON<{ replies: Array<{ content: string; tone: string }> }>(content);

    return {
      replies: result.replies || [],
      usage,
    };
  }

  async compose(
    params: {
      description: string;
      tone: string;
      length: string;
      language?: string;
    },
    options?: AIServiceOptions
  ) {
    const service = this.getService(options);
    const userPrompt = buildComposeUserPrompt(params);

    const { content, usage } = await service.chat({
      systemPrompt: COMPOSE_SYSTEM_PROMPT,
      userPrompt,
    });

    const result = this.parseJSON<{ subject: string; body: string }>(content);

    return {
      subject: result.subject || '',
      body: result.body || '',
      usage,
    };
  }

  async summarize(
    params: {
      emailContent: string;
      type: 'single' | 'thread';
    },
    options?: AIServiceOptions
  ) {
    const service = this.getService(options);
    const userPrompt = buildSummarizeUserPrompt(params);

    const { content, usage } = await service.chat({
      systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
      userPrompt,
    });

    const result = this.parseJSON<{
      summary: string;
      keyPoints: string[];
      actionItems: string[];
      entities: {
        dates: string[];
        amounts: string[];
        people: string[];
        deadlines: string[];
        locations: string[];
      };
    }>(content);

    return {
      summary: result.summary || '',
      keyPoints: result.keyPoints || [],
      actionItems: result.actionItems || [],
      entities: result.entities || { dates: [], amounts: [], people: [], deadlines: [], locations: [] },
      usage,
    };
  }

  async analyze(emailContent: string, options?: AIServiceOptions) {
    const service = this.getService(options);
    const userPrompt = buildAnalyzeUserPrompt(emailContent);

    const { content, usage } = await service.chat({
      systemPrompt: ANALYZE_SYSTEM_PROMPT,
      userPrompt,
    });

    const result = this.parseJSON<{
      sentiment: string;
      urgency: string;
      category: string;
      entities: {
        dates: string[];
        amounts: string[];
        people: string[];
        deadlines: string[];
        locations: string[];
      };
    }>(content);

    return {
      sentiment: result.sentiment || 'neutral',
      urgency: result.urgency || 'low',
      category: result.category || 'other',
      entities: result.entities || { dates: [], amounts: [], people: [], deadlines: [], locations: [] },
      usage,
    };
  }

  async improve(
    params: {
      content: string;
      action: 'grammar' | 'professional' | 'expand' | 'shorten' | 'translate';
      targetLanguage?: string;
    },
    options?: AIServiceOptions
  ) {
    const service = this.getService(options);
    const userPrompt = buildImproveUserPrompt(params);

    const { content, usage } = await service.chat({
      systemPrompt: IMPROVE_SYSTEM_PROMPT,
      userPrompt,
    });

    const result = this.parseJSON<{
      improvedContent: string;
      changes: string[];
    }>(content);

    return {
      improvedContent: result.improvedContent || '',
      changes: result.changes || [],
      usage,
    };
  }
}

export const aiService = new AIService();
