import { FastifyRequest, FastifyReply } from 'fastify';
import { aiService } from '../services/ai/index.js';
import { logger } from '../utils/logger.js';

interface ReplyBody {
  emailContent: string;
  threadContext?: string;
  tone: string;
  length: string;
  language?: string;
  provider?: 'openai' | 'anthropic';
}

interface ComposeBody {
  description: string;
  tone: string;
  length: string;
  language?: string;
  provider?: 'openai' | 'anthropic';
}

interface SummarizeBody {
  emailContent: string;
  type: 'single' | 'thread';
  provider?: 'openai' | 'anthropic';
}

interface AnalyzeBody {
  emailContent: string;
  provider?: 'openai' | 'anthropic';
}

interface ImproveBody {
  content: string;
  action: 'grammar' | 'professional' | 'expand' | 'shorten' | 'translate';
  targetLanguage?: string;
  provider?: 'openai' | 'anthropic';
}

export const aiController = {
  async generateReply(
    request: FastifyRequest<{ Body: ReplyBody }>,
    reply: FastifyReply
  ) {
    try {
      const { emailContent, threadContext, tone, length, language, provider } = request.body;
      const apiKey = request.headers['x-api-key'] as string | undefined;

      const result = await aiService.generateReply(
        { emailContent, threadContext, tone, length, language },
        { provider: provider || 'openai', apiKey }
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ msg: 'Failed to generate reply', error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate reply',
        },
      });
    }
  },

  async compose(
    request: FastifyRequest<{ Body: ComposeBody }>,
    reply: FastifyReply
  ) {
    try {
      const { description, tone, length, language, provider } = request.body;
      const apiKey = request.headers['x-api-key'] as string | undefined;

      const result = await aiService.compose(
        { description, tone, length, language },
        { provider: provider || 'openai', apiKey }
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ msg: 'Failed to compose email', error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to compose email',
        },
      });
    }
  },

  async summarize(
    request: FastifyRequest<{ Body: SummarizeBody }>,
    reply: FastifyReply
  ) {
    try {
      const { emailContent, type, provider } = request.body;
      const apiKey = request.headers['x-api-key'] as string | undefined;

      const result = await aiService.summarize(
        { emailContent, type },
        { provider: provider || 'openai', apiKey }
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ msg: 'Failed to summarize email', error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to summarize email',
        },
      });
    }
  },

  async analyze(
    request: FastifyRequest<{ Body: AnalyzeBody }>,
    reply: FastifyReply
  ) {
    try {
      const { emailContent, provider } = request.body;
      const apiKey = request.headers['x-api-key'] as string | undefined;

      const result = await aiService.analyze(emailContent, {
        provider: provider || 'openai',
        apiKey,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ msg: 'Failed to analyze email', error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze email',
        },
      });
    }
  },

  async improve(
    request: FastifyRequest<{ Body: ImproveBody }>,
    reply: FastifyReply
  ) {
    try {
      const { content, action, targetLanguage, provider } = request.body;
      const apiKey = request.headers['x-api-key'] as string | undefined;

      const result = await aiService.improve(
        { content, action, targetLanguage },
        { provider: provider || 'openai', apiKey }
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ msg: 'Failed to improve content', error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to improve content',
        },
      });
    }
  },
};
