/**
 * Ultra Features API Routes
 * Voice, Smart CC, Health, Crisis, Coach, Gamification, Templates, Thread Vis, Unsubscribe, Compliance
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { voiceEmailService } from '../services/voice/index.js';
import { smartCCService } from '../services/smartcc/index.js';
import { emailHealthService } from '../services/health/index.js';
import { crisisDetectionService } from '../services/crisis/index.js';
import { writingCoachService } from '../services/coach/index.js';
import { gamificationService } from '../services/gamification/index.js';
import { smartTemplateService } from '../services/templates/index.js';
import { threadVisualizationService } from '../services/threadvis/index.js';
import { smartUnsubscribeService } from '../services/unsubscribe/index.js';
import { complianceCheckerService } from '../services/compliance/index.js';

export async function ultraRoutes(fastify: FastifyInstance): Promise<void> {
  // ==================== Voice Email Routes ====================

  // Convert voice to email
  fastify.post('/voice/to-email', async (request: FastifyRequest, reply: FastifyReply) => {
    const { audioBase64, format, language } = request.body as any;
    const result = await voiceEmailService.voiceToEmail({
      data: Buffer.from(audioBase64, 'base64'),
      format: format || 'wav',
      language,
    });
    return result;
  });

  // Convert email to speech
  fastify.post('/voice/email-to-speech', async (request: FastifyRequest, reply: FastifyReply) => {
    const { emailContent, voice, speed } = request.body as any;
    const result = await voiceEmailService.emailToSpeech(emailContent, { voice, speed });
    return result;
  });

  // Create voice memo
  fastify.post('/voice/memo', async (request: FastifyRequest, reply: FastifyReply) => {
    const { audioBase64, format, context } = request.body as any;
    const memo = await voiceEmailService.createVoiceMemo(
      { data: Buffer.from(audioBase64, 'base64'), format: format || 'wav' },
      context
    );
    return memo;
  });

  // Get voice memos
  fastify.get('/voice/memos', async (request: FastifyRequest, reply: FastifyReply) => {
    const memos = voiceEmailService.getVoiceMemos();
    return { memos };
  });

  // Parse voice command
  fastify.post('/voice/command', async (request: FastifyRequest, reply: FastifyReply) => {
    const { audioBase64, format } = request.body as any;
    const command = await voiceEmailService.parseVoiceCommand({
      data: Buffer.from(audioBase64, 'base64'),
      format: format || 'wav',
    });
    return command;
  });

  // ==================== Smart CC Routes ====================

  // Analyze CC needs
  fastify.post('/smartcc/analyze', async (request: FastifyRequest, reply: FastifyReply) => {
    const { subject, body, currentTo, currentCc } = request.body as any;
    const analysis = await smartCCService.analyzeCCNeeds({
      subject,
      body,
      currentTo: currentTo || [],
      currentCc: currentCc || [],
    });
    return analysis;
  });

  // Check reply-all appropriateness
  fastify.post('/smartcc/check-reply-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const { originalEmail, replyContent } = request.body as any;
    const result = await smartCCService.checkReplyAll(originalEmail, replyContent);
    return result;
  });

  // Detect missing stakeholders
  fastify.post('/smartcc/missing-stakeholders', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as any;
    const missing = await smartCCService.detectMissingStakeholders(email);
    return { missing };
  });

  // Update org structure
  fastify.post('/smartcc/org-structure', async (request: FastifyRequest, reply: FastifyReply) => {
    const { structure } = request.body as any;
    smartCCService.updateOrgStructure(structure);
    return { success: true };
  });

  // ==================== Email Health Routes ====================

  // Record daily stats
  fastify.post('/health/daily-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, stats } = request.body as any;
    emailHealthService.recordDailyStats(userId, stats);
    return { success: true };
  });

  // Get health score
  fastify.get('/health/score/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const score = emailHealthService.calculateHealthScore(userId);
    return score;
  });

  // Get anxiety index
  fastify.get('/health/anxiety/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const anxiety = emailHealthService.calculateAnxietyIndex(userId);
    return anxiety;
  });

  // Get recommendations
  fastify.get('/health/recommendations/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const recommendations = emailHealthService.generateRecommendations(userId);
    return { recommendations };
  });

  // Get weekly report
  fastify.get('/health/weekly-report/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const report = emailHealthService.generateWeeklyReport(userId);
    return report;
  });

  // Update settings
  fastify.post('/health/settings/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { settings } = request.body as any;
    emailHealthService.updateSettings(userId, settings);
    return { success: true };
  });

  // ==================== Crisis Detection Routes ====================

  // Scan email for crisis
  fastify.post('/crisis/scan', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as any;
    const alert = await crisisDetectionService.scanEmail(email);
    return { alert };
  });

  // Get dashboard
  fastify.get('/crisis/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const dashboard = crisisDetectionService.getDashboard();
    return dashboard;
  });

  // Acknowledge alert
  fastify.post('/crisis/acknowledge/:alertId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { alertId } = request.params as any;
    const { userId, note } = request.body as any;
    const alert = crisisDetectionService.acknowledgeAlert(alertId, userId, note);
    return { alert };
  });

  // Update alert status
  fastify.put('/crisis/alert/:alertId/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { alertId } = request.params as any;
    const { status, note } = request.body as any;
    const alert = crisisDetectionService.updateAlertStatus(alertId, status, note);
    return { alert };
  });

  // Get patterns
  fastify.get('/crisis/patterns', async (request: FastifyRequest, reply: FastifyReply) => {
    const patterns = crisisDetectionService.getPatterns();
    return { patterns };
  });

  // Add pattern
  fastify.post('/crisis/patterns', async (request: FastifyRequest, reply: FastifyReply) => {
    const { pattern } = request.body as any;
    const newPattern = crisisDetectionService.addPattern(pattern);
    return newPattern;
  });

  // ==================== Writing Coach Routes ====================

  // Analyze writing
  fastify.post('/coach/analyze', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, emailContent, context } = request.body as any;
    const analysis = await writingCoachService.analyzeWriting(userId, emailContent, context);
    return analysis;
  });

  // Get skill levels
  fastify.get('/coach/skills/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const skills = writingCoachService.getSkillLevels(userId);
    return skills;
  });

  // Get personalized tips
  fastify.get('/coach/tips/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const tips = await writingCoachService.getPersonalizedTips(userId);
    return { tips };
  });

  // Generate lesson
  fastify.post('/coach/lesson/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { skill } = request.body as any;
    const lesson = await writingCoachService.generateLesson(userId, skill);
    return lesson;
  });

  // Get challenges
  fastify.get('/coach/challenges/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const challenges = await writingCoachService.getChallenges(userId);
    return { challenges };
  });

  // Complete challenge
  fastify.post('/coach/challenges/:userId/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { challengeId, submission } = request.body as any;
    const result = await writingCoachService.completeChallenge(userId, challengeId, submission);
    return result;
  });

  // Get badges
  fastify.get('/coach/badges/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const badges = writingCoachService.getBadges(userId);
    return { badges };
  });

  // ==================== Gamification Routes ====================

  // Get profile
  fastify.get('/game/profile/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const profile = gamificationService.getProfile(userId);
    return profile;
  });

  // Add XP
  fastify.post('/game/xp/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { amount, reason } = request.body as any;
    const result = gamificationService.addXp(userId, amount, reason);
    return result;
  });

  // Record activity
  fastify.post('/game/activity/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { activityType, data } = request.body as any;
    gamificationService.recordActivity(userId, activityType, data);
    return { success: true };
  });

  // Get daily challenges
  fastify.get('/game/challenges/daily/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const challenges = gamificationService.getDailyChallenges(userId);
    return { challenges };
  });

  // Get weekly quests
  fastify.get('/game/quests/weekly/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const quests = gamificationService.getWeeklyQuests(userId);
    return { quests };
  });

  // Update challenge progress
  fastify.post('/game/challenges/:userId/progress', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as any;
    const { challengeId, progress } = request.body as any;
    gamificationService.updateChallengeProgress(userId, challengeId, progress);
    return { success: true };
  });

  // Get leaderboard
  fastify.get('/game/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, limit } = request.query as any;
    const leaderboard = gamificationService.getLeaderboard(type || 'weekly', Number(limit) || 10);
    return { leaderboard };
  });

  // Get achievements
  fastify.get('/game/achievements', async (request: FastifyRequest, reply: FastifyReply) => {
    const achievements = gamificationService.getAllAchievements();
    return { achievements };
  });

  // ==================== Smart Template Routes ====================

  // Get templates
  fastify.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const { category, language } = request.query as any;
    const templates = smartTemplateService.getTemplates(category, language);
    return { templates };
  });

  // Get template by ID
  fastify.get('/templates/:templateId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { templateId } = request.params as any;
    const template = smartTemplateService.getTemplate(templateId);
    return template;
  });

  // Create template
  fastify.post('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const { template } = request.body as any;
    const newTemplate = smartTemplateService.createTemplate(template);
    return newTemplate;
  });

  // Adapt template
  fastify.post('/templates/:templateId/adapt', async (request: FastifyRequest, reply: FastifyReply) => {
    const { templateId } = request.params as any;
    const { context } = request.body as any;
    const adapted = await smartTemplateService.adaptTemplate(templateId, context);
    return adapted;
  });

  // Recommend templates
  fastify.post('/templates/recommend', async (request: FastifyRequest, reply: FastifyReply) => {
    const { purpose, recipientInfo } = request.body as any;
    const recommendations = await smartTemplateService.recommendTemplates(purpose, recipientInfo);
    return { recommendations };
  });

  // Generate template from email
  fastify.post('/templates/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, name, category } = request.body as any;
    const template = await smartTemplateService.generateTemplateFromEmail(email, name, category);
    return template;
  });

  // Record template success
  fastify.post('/templates/:templateId/success', async (request: FastifyRequest, reply: FastifyReply) => {
    const { templateId } = request.params as any;
    const { gotResponse, responseTime, sentiment } = request.body as any;
    smartTemplateService.recordTemplateSuccess(templateId, gotResponse, responseTime, sentiment);
    return { success: true };
  });

  // Get categories
  fastify.get('/templates/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    const categories = smartTemplateService.getCategories();
    return { categories };
  });

  // ==================== Thread Visualization Routes ====================

  // Process thread
  fastify.post('/thread/process', async (request: FastifyRequest, reply: FastifyReply) => {
    const { emails } = request.body as any;
    const result = await threadVisualizationService.processThread(emails);
    return result;
  });

  // Get thread data
  fastify.get('/thread/:threadId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { threadId } = request.params as any;
    const data = threadVisualizationService.getThreadData(threadId);
    return data;
  });

  // Get timeline
  fastify.get('/thread/:threadId/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const { threadId } = request.params as any;
    const timeline = await threadVisualizationService.generateTimeline(threadId);
    return timeline;
  });

  // Get summary
  fastify.get('/thread/:threadId/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const { threadId } = request.params as any;
    const summary = await threadVisualizationService.generateSummary(threadId);
    return summary;
  });

  // Get visualization
  fastify.get('/thread/:threadId/visualization/:type', async (request: FastifyRequest, reply: FastifyReply) => {
    const { threadId, type } = request.params as any;
    const visualization = threadVisualizationService.generateVisualization(threadId, type);
    return visualization;
  });

  // ==================== Unsubscribe Manager Routes ====================

  // Detect subscription
  fastify.post('/unsubscribe/detect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as any;
    const subscription = await smartUnsubscribeService.detectSubscription(email);
    return { subscription };
  });

  // Get subscriptions
  fastify.get('/unsubscribe/subscriptions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { status, category, importance } = request.query as any;
    const subscriptions = smartUnsubscribeService.getSubscriptions({ status, category, importance });
    return { subscriptions };
  });

  // Unsubscribe
  fastify.post('/unsubscribe/:subscriptionId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { subscriptionId } = request.params as any;
    const result = await smartUnsubscribeService.unsubscribe(subscriptionId);
    return result;
  });

  // Bulk unsubscribe
  fastify.post('/unsubscribe/bulk', async (request: FastifyRequest, reply: FastifyReply) => {
    const { subscriptionIds } = request.body as any;
    const job = await smartUnsubscribeService.bulkUnsubscribe(subscriptionIds);
    return job;
  });

  // Block sender
  fastify.post('/unsubscribe/:subscriptionId/block', async (request: FastifyRequest, reply: FastifyReply) => {
    const { subscriptionId } = request.params as any;
    const subscription = smartUnsubscribeService.blockSender(subscriptionId);
    return { subscription };
  });

  // Get analytics
  fastify.get('/unsubscribe/analytics', async (request: FastifyRequest, reply: FastifyReply) => {
    const analytics = smartUnsubscribeService.getAnalytics();
    return analytics;
  });

  // Get insights
  fastify.get('/unsubscribe/insights', async (request: FastifyRequest, reply: FastifyReply) => {
    const insights = smartUnsubscribeService.getInsights();
    return { insights };
  });

  // Record interaction
  fastify.post('/unsubscribe/:subscriptionId/interaction', async (request: FastifyRequest, reply: FastifyReply) => {
    const { subscriptionId } = request.params as any;
    const { action } = request.body as any;
    smartUnsubscribeService.recordInteraction(subscriptionId, action);
    return { success: true };
  });

  // ==================== Compliance Checker Routes ====================

  // Check compliance
  fastify.post('/compliance/check', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, policyId } = request.body as any;
    const result = await complianceCheckerService.checkCompliance(email, policyId);
    return result;
  });

  // Auto-fix content
  fastify.post('/compliance/auto-fix', async (request: FastifyRequest, reply: FastifyReply) => {
    const { content, violations } = request.body as any;
    const result = complianceCheckerService.autoFixContent(content, violations);
    return result;
  });

  // Get policies
  fastify.get('/compliance/policies', async (request: FastifyRequest, reply: FastifyReply) => {
    const policies = complianceCheckerService.getAllPolicies();
    return { policies };
  });

  // Get policy by ID
  fastify.get('/compliance/policies/:policyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { policyId } = request.params as any;
    const policy = complianceCheckerService.getPolicy(policyId);
    return policy;
  });

  // Create policy
  fastify.post('/compliance/policies', async (request: FastifyRequest, reply: FastifyReply) => {
    const { policy } = request.body as any;
    const newPolicy = complianceCheckerService.createPolicy(policy);
    return newPolicy;
  });

  // Update policy
  fastify.put('/compliance/policies/:policyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { policyId } = request.params as any;
    const { updates } = request.body as any;
    const policy = complianceCheckerService.updatePolicy(policyId, updates);
    return { policy };
  });

  // Generate report
  fastify.get('/compliance/report', async (request: FastifyRequest, reply: FastifyReply) => {
    const { periodDays } = request.query as any;
    const report = complianceCheckerService.generateReport(Number(periodDays) || 30);
    return report;
  });

  // Get check history
  fastify.get('/compliance/history/:emailId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { emailId } = request.params as any;
    const history = complianceCheckerService.getCheckHistory(emailId);
    return { history };
  });
}
