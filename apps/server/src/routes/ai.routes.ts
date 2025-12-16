import { FastifyInstance } from 'fastify';
import { aiController } from '../controllers/ai.controller.js';

const replySchema = {
  body: {
    type: 'object',
    required: ['emailContent', 'tone', 'length'],
    properties: {
      emailContent: { type: 'string', minLength: 1 },
      threadContext: { type: 'string' },
      tone: { type: 'string', enum: ['formal', 'friendly', 'concise', 'detailed', 'casual'] },
      length: { type: 'string', enum: ['short', 'medium', 'long'] },
      language: { type: 'string' },
      provider: { type: 'string', enum: ['openai', 'anthropic'] },
    },
  },
};

const composeSchema = {
  body: {
    type: 'object',
    required: ['description', 'tone', 'length'],
    properties: {
      description: { type: 'string', minLength: 1 },
      tone: { type: 'string', enum: ['formal', 'friendly', 'concise', 'detailed', 'casual'] },
      length: { type: 'string', enum: ['short', 'medium', 'long'] },
      language: { type: 'string' },
      provider: { type: 'string', enum: ['openai', 'anthropic'] },
    },
  },
};

const summarizeSchema = {
  body: {
    type: 'object',
    required: ['emailContent', 'type'],
    properties: {
      emailContent: { type: 'string', minLength: 1 },
      type: { type: 'string', enum: ['single', 'thread'] },
      provider: { type: 'string', enum: ['openai', 'anthropic'] },
    },
  },
};

const analyzeSchema = {
  body: {
    type: 'object',
    required: ['emailContent'],
    properties: {
      emailContent: { type: 'string', minLength: 1 },
      provider: { type: 'string', enum: ['openai', 'anthropic'] },
    },
  },
};

const improveSchema = {
  body: {
    type: 'object',
    required: ['content', 'action'],
    properties: {
      content: { type: 'string', minLength: 1 },
      action: { type: 'string', enum: ['grammar', 'professional', 'expand', 'shorten', 'translate'] },
      targetLanguage: { type: 'string' },
      provider: { type: 'string', enum: ['openai', 'anthropic'] },
    },
  },
};

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.post('/reply', { schema: replySchema }, aiController.generateReply);
  fastify.post('/compose', { schema: composeSchema }, aiController.compose);
  fastify.post('/summarize', { schema: summarizeSchema }, aiController.summarize);
  fastify.post('/analyze', { schema: analyzeSchema }, aiController.analyze);
  fastify.post('/improve', { schema: improveSchema }, aiController.improve);
}
