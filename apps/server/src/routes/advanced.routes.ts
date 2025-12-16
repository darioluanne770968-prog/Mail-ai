/**
 * Advanced Features API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ragService } from '../services/rag/index.js';
import { learningService } from '../services/learning/index.js';
import { securityService } from '../services/security/index.js';
import { workflowService } from '../services/workflow/index.js';
import { batchProcessingService } from '../services/batch/index.js';
import { analyticsService } from '../services/analytics/index.js';
import { calendarService } from '../services/calendar/index.js';
import { chatAssistantService } from '../services/chat/index.js';
import { logger } from '../utils/logger.js';

export async function advancedRoutes(fastify: FastifyInstance) {
  // ==================== RAG / Knowledge Base ====================

  fastify.post('/knowledge-base/create', async (request: FastifyRequest<{
    Body: { name: string };
  }>, reply: FastifyReply) => {
    const userId = 'user_123'; // Get from auth in production
    const kb = await ragService.createKnowledgeBase(userId, request.body.name);
    return reply.send({ success: true, data: kb });
  });

  fastify.post('/knowledge-base/:kbId/documents', async (request: FastifyRequest<{
    Params: { kbId: string };
    Body: { content: string; source: string; title?: string };
  }>, reply: FastifyReply) => {
    const { kbId } = request.params;
    const { content, source, title } = request.body;
    const doc = await ragService.addDocument(kbId, content, { source, title });
    return reply.send({ success: true, data: doc });
  });

  fastify.post('/knowledge-base/:kbId/search', async (request: FastifyRequest<{
    Params: { kbId: string };
    Body: { query: string; emailContext?: string };
  }>, reply: FastifyReply) => {
    const { kbId } = request.params;
    const { query, emailContext } = request.body;
    const result = await ragService.generateWithRAG({ kbId, query, emailContext });
    return reply.send({ success: true, data: result });
  });

  // ==================== Personalized Learning ====================

  fastify.post('/learning/train', async (request: FastifyRequest<{
    Body: { content: string; recipient?: string; subject?: string };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const analysis = await learningService.learnFromEmail(userId, {
      id: `email_${Date.now()}`,
      content: request.body.content,
      recipient: request.body.recipient,
      subject: request.body.subject,
      timestamp: new Date(),
    });
    return reply.send({ success: true, data: analysis });
  });

  fastify.post('/learning/generate-personalized', async (request: FastifyRequest<{
    Body: { emailContent: string; recipientEmail?: string; baseTone: string };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const reply_content = await learningService.generatePersonalizedReply({
      userId,
      emailContent: request.body.emailContent,
      recipientEmail: request.body.recipientEmail,
      baseTone: request.body.baseTone,
    });
    return reply.send({ success: true, data: { reply: reply_content } });
  });

  fastify.get('/learning/style', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = 'user_123';
    const style = learningService.getStyleSummary(userId);
    return reply.send({ success: true, data: style });
  });

  fastify.post('/learning/predict', async (request: FastifyRequest<{
    Body: { currentText: string };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const predictions = await learningService.predictNextPhrase(userId, request.body.currentText);
    return reply.send({ success: true, data: { predictions } });
  });

  // ==================== Security ====================

  fastify.post('/security/scan', async (request: FastifyRequest<{
    Body: {
      content: string;
      subject?: string;
      sender?: string;
      links?: string[];
      attachments?: string[];
    };
  }>, reply: FastifyReply) => {
    const result = await securityService.scanEmail(request.body);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/security/scan-before-send', async (request: FastifyRequest<{
    Body: { content: string };
  }>, reply: FastifyReply) => {
    const result = await securityService.scanBeforeSend(request.body.content);
    return reply.send({ success: true, data: result });
  });

  // ==================== Workflow Automation ====================

  fastify.get('/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = 'user_123';
    const workflows = workflowService.getWorkflows(userId);
    return reply.send({ success: true, data: workflows });
  });

  fastify.get('/workflows/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const templates = workflowService.getTemplates();
    return reply.send({ success: true, data: templates });
  });

  fastify.post('/workflows', async (request: FastifyRequest<{
    Body: {
      name: string;
      description?: string;
      trigger: any;
      actions: any[];
    };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const workflow = workflowService.createWorkflow({
      userId,
      name: request.body.name,
      description: request.body.description,
      trigger: request.body.trigger,
      actions: request.body.actions,
    });
    return reply.send({ success: true, data: workflow });
  });

  fastify.delete('/workflows/:workflowId', async (request: FastifyRequest<{
    Params: { workflowId: string };
  }>, reply: FastifyReply) => {
    const deleted = workflowService.deleteWorkflow(request.params.workflowId);
    return reply.send({ success: deleted });
  });

  // ==================== Batch Processing ====================

  fastify.post('/batch/process', async (request: FastifyRequest<{
    Body: { emails: any[] };
  }>, reply: FastifyReply) => {
    const result = await batchProcessingService.processBatch(request.body.emails);
    return reply.send({ success: true, data: result });
  });

  fastify.post('/batch/inbox-zero', async (request: FastifyRequest<{
    Body: { emails: any[] };
  }>, reply: FastifyReply) => {
    const suggestions = await batchProcessingService.suggestInboxZeroActions(request.body.emails);
    return reply.send({ success: true, data: suggestions });
  });

  fastify.post('/batch/daily-digest', async (request: FastifyRequest<{
    Body: { emails: any[] };
  }>, reply: FastifyReply) => {
    const digest = await batchProcessingService.generateDailyDigest(request.body.emails);
    return reply.send({ success: true, data: digest });
  });

  // ==================== Analytics ====================

  fastify.get('/analytics/daily-stats', async (request: FastifyRequest<{
    Querystring: { days?: string };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const days = parseInt(request.query.days || '30', 10);
    const stats = analyticsService.getDailyStats(userId, days);
    return reply.send({ success: true, data: stats });
  });

  fastify.get('/analytics/response-time', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = 'user_123';
    const analysis = analyticsService.getResponseTimeAnalysis(userId);
    return reply.send({ success: true, data: analysis });
  });

  fastify.get('/analytics/communication-insights', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = 'user_123';
    const insights = analyticsService.getCommunicationInsights(userId);
    return reply.send({ success: true, data: insights });
  });

  fastify.get('/analytics/productivity-score', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = 'user_123';
    const score = analyticsService.getProductivityScore(userId);
    return reply.send({ success: true, data: score });
  });

  fastify.get('/analytics/ai-insights', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = 'user_123';
    const insights = analyticsService.getAIInsights(userId);
    return reply.send({ success: true, data: insights });
  });

  fastify.get('/analytics/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = 'user_123';
    const data = analyticsService.exportAnalytics(userId);
    return reply.send({ success: true, data });
  });

  // ==================== Calendar ====================

  fastify.post('/calendar/extract-meeting', async (request: FastifyRequest<{
    Body: { emailContent: string };
  }>, reply: FastifyReply) => {
    const meetingInfo = await calendarService.extractMeetingInfo(request.body.emailContent);
    return reply.send({ success: true, data: meetingInfo });
  });

  fastify.post('/calendar/create-from-email', async (request: FastifyRequest<{
    Body: { emailId: string; emailContent: string; overrides?: any };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const event = await calendarService.createEventFromEmail({
      userId,
      emailId: request.body.emailId,
      emailContent: request.body.emailContent,
      overrides: request.body.overrides,
    });
    return reply.send({ success: true, data: event });
  });

  fastify.post('/calendar/check-availability', async (request: FastifyRequest<{
    Body: { date: string; duration: number; preferredHours?: { start: number; end: number } };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const suggestions = await calendarService.checkAvailability({
      userId,
      date: new Date(request.body.date),
      duration: request.body.duration,
      preferredHours: request.body.preferredHours,
    });
    return reply.send({ success: true, data: suggestions });
  });

  fastify.get('/calendar/today', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = 'user_123';
    const summary = await calendarService.getTodaySummary(userId);
    return reply.send({ success: true, data: summary });
  });

  fastify.get('/calendar/upcoming', async (request: FastifyRequest<{
    Querystring: { days?: string };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const days = parseInt(request.query.days || '7', 10);
    const events = calendarService.getUpcomingEvents(userId, days);
    return reply.send({ success: true, data: events });
  });

  fastify.post('/calendar/meeting-reply', async (request: FastifyRequest<{
    Body: {
      emailContent: string;
      action: 'accept' | 'decline' | 'suggest_alternative';
      suggestedTime?: string;
      reason?: string;
    };
  }>, reply: FastifyReply) => {
    const replyText = await calendarService.generateMeetingReply({
      emailContent: request.body.emailContent,
      action: request.body.action,
      suggestedTime: request.body.suggestedTime ? new Date(request.body.suggestedTime) : undefined,
      reason: request.body.reason,
    });
    return reply.send({ success: true, data: { reply: replyText } });
  });

  // ==================== Chat Assistant ====================

  fastify.post('/chat', async (request: FastifyRequest<{
    Body: {
      message: string;
      sessionId?: string;
      emailContext?: {
        id: string;
        subject: string;
        from: string;
        body: string;
      };
    };
  }>, reply: FastifyReply) => {
    const userId = 'user_123';
    const response = await chatAssistantService.chat({
      userId,
      sessionId: request.body.sessionId,
      message: request.body.message,
      emailContext: request.body.emailContext,
    });
    return reply.send({ success: true, data: response });
  });

  fastify.get('/chat/:sessionId/history', async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    const history = chatAssistantService.getChatHistory(request.params.sessionId);
    return reply.send({ success: true, data: history });
  });

  fastify.delete('/chat/:sessionId', async (request: FastifyRequest<{
    Params: { sessionId: string };
  }>, reply: FastifyReply) => {
    const cleared = chatAssistantService.clearSession(request.params.sessionId);
    return reply.send({ success: cleared });
  });

  logger.info('Advanced routes registered');
}
