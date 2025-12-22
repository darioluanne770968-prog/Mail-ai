/**
 * Smart Unsubscribe Manager Service
 * One-click unsubscribe with tracking and analytics
 */

import { AIService } from '../ai/index.js';

export type SubscriptionCategory =
  | 'newsletter'
  | 'marketing'
  | 'notifications'
  | 'social'
  | 'updates'
  | 'promotions'
  | 'transactional'
  | 'alerts'
  | 'other';

export interface EmailSubscription {
  id: string;
  senderEmail: string;
  senderName: string;
  senderDomain: string;
  category: SubscriptionCategory;
  frequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
  avgPerWeek: number;
  firstReceived: Date;
  lastReceived: Date;
  totalReceived: number;
  readRate: number; // Percentage of opened emails
  interactionRate: number; // Clicked links, replied, etc.
  unsubscribeLink?: string;
  unsubscribeEmail?: string;
  status: 'active' | 'unsubscribed' | 'pending' | 'blocked';
  importance: 'high' | 'medium' | 'low';
  spamScore: number; // 0-100
  lastAction?: {
    type: 'unsubscribe' | 'keep' | 'block';
    date: Date;
  };
}

export interface UnsubscribeResult {
  subscriptionId: string;
  success: boolean;
  method: 'link' | 'email' | 'header' | 'manual';
  message: string;
  timestamp: Date;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  unsubscribedCount: number;
  blockedCount: number;
  byCategory: Record<SubscriptionCategory, number>;
  topSenders: Array<{
    sender: string;
    count: number;
    readRate: number;
  }>;
  weeklyEmailVolume: number;
  potentialTimeSaved: number; // minutes per week
  recommendations: Array<{
    type: 'unsubscribe' | 'reduce' | 'keep';
    subscription: EmailSubscription;
    reason: string;
  }>;
}

export interface BulkUnsubscribeJob {
  id: string;
  subscriptionIds: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  results: UnsubscribeResult[];
  startedAt: Date;
  completedAt?: Date;
}

export interface SubscriptionInsight {
  type: 'unused' | 'spam_likely' | 'high_volume' | 'low_engagement' | 'valuable';
  title: string;
  description: string;
  subscriptions: EmailSubscription[];
  suggestedAction: string;
}

// In-memory storage
const subscriptions = new Map<string, EmailSubscription>();
const unsubscribeHistory = new Map<string, UnsubscribeResult[]>();
const bulkJobs = new Map<string, BulkUnsubscribeJob>();

export class SmartUnsubscribeService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Scan email to detect subscription
   */
  async detectSubscription(email: {
    id: string;
    from: string;
    subject: string;
    body: string;
    headers?: Record<string, string>;
    receivedAt: Date;
  }): Promise<EmailSubscription | null> {
    const senderEmail = email.from;
    const senderDomain = senderEmail.split('@')[1] || '';
    const existingId = `sub_${senderDomain.replace(/\./g, '_')}`;

    // Check if already tracked
    const existing = subscriptions.get(existingId);
    if (existing) {
      // Update stats
      existing.totalReceived++;
      existing.lastReceived = email.receivedAt;
      this.updateFrequency(existing);
      return existing;
    }

    // Detect if this is a subscription email
    const isSubscription = this.isSubscriptionEmail(email);
    if (!isSubscription) return null;

    // Extract unsubscribe info
    const unsubscribeInfo = this.extractUnsubscribeInfo(email);

    // Categorize
    const category = await this.categorizeSubscription(email);

    // Calculate importance
    const importance = this.calculateImportance(senderDomain, category);

    const subscription: EmailSubscription = {
      id: existingId,
      senderEmail,
      senderName: this.extractSenderName(email.from),
      senderDomain,
      category,
      frequency: 'irregular',
      avgPerWeek: 0,
      firstReceived: email.receivedAt,
      lastReceived: email.receivedAt,
      totalReceived: 1,
      readRate: 0,
      interactionRate: 0,
      unsubscribeLink: unsubscribeInfo.link,
      unsubscribeEmail: unsubscribeInfo.email,
      status: 'active',
      importance,
      spamScore: this.calculateSpamScore(email),
    };

    subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Check if email is a subscription/newsletter
   */
  private isSubscriptionEmail(email: {
    subject: string;
    body: string;
    headers?: Record<string, string>;
  }): boolean {
    // Check headers
    if (email.headers) {
      if (email.headers['list-unsubscribe']) return true;
      if (email.headers['x-mailer']?.includes('newsletter')) return true;
      if (email.headers['precedence'] === 'bulk') return true;
    }

    // Check content patterns
    const patterns = [
      /unsubscribe/i,
      /退订/,
      /取消订阅/,
      /opt.?out/i,
      /email preferences/i,
      /邮件设置/,
      /newsletter/i,
      /this email was sent to/i,
      /you received this/i,
      /管理您的订阅/,
    ];

    const content = `${email.subject} ${email.body}`;
    return patterns.some(p => p.test(content));
  }

  /**
   * Extract unsubscribe information
   */
  private extractUnsubscribeInfo(email: {
    body: string;
    headers?: Record<string, string>;
  }): { link?: string; email?: string } {
    const result: { link?: string; email?: string } = {};

    // Check List-Unsubscribe header
    if (email.headers?.['list-unsubscribe']) {
      const header = email.headers['list-unsubscribe'];
      const urlMatch = header.match(/<(https?:\/\/[^>]+)>/);
      const emailMatch = header.match(/<mailto:([^>]+)>/);

      if (urlMatch) result.link = urlMatch[1];
      if (emailMatch) result.email = emailMatch[1];
    }

    // Extract from body
    if (!result.link) {
      const urlPatterns = [
        /(?:unsubscribe|退订|取消订阅)[^"'<]*(?:href=["']([^"']+)["'])/i,
        /(?:href=["'])([^"']*(?:unsubscribe|optout|opt-out)[^"']*)["']/i,
      ];

      for (const pattern of urlPatterns) {
        const match = email.body.match(pattern);
        if (match?.[1]) {
          result.link = match[1];
          break;
        }
      }
    }

    return result;
  }

  /**
   * Categorize subscription type
   */
  private async categorizeSubscription(email: {
    from: string;
    subject: string;
    body: string;
  }): Promise<SubscriptionCategory> {
    const content = `${email.subject} ${email.body}`.toLowerCase();
    const sender = email.from.toLowerCase();

    // Rule-based categorization
    if (sender.includes('noreply') || sender.includes('notification')) {
      return 'notifications';
    }
    if (sender.includes('marketing') || content.includes('sale') || content.includes('折扣')) {
      return 'marketing';
    }
    if (sender.includes('newsletter') || content.includes('newsletter') || content.includes('通讯')) {
      return 'newsletter';
    }
    if (content.includes('social') || sender.includes('facebook') || sender.includes('linkedin')) {
      return 'social';
    }
    if (content.includes('promotion') || content.includes('优惠') || content.includes('special offer')) {
      return 'promotions';
    }
    if (content.includes('alert') || content.includes('提醒') || content.includes('warning')) {
      return 'alerts';
    }
    if (content.includes('update') || content.includes('更新') || content.includes('release')) {
      return 'updates';
    }

    return 'other';
  }

  /**
   * Calculate importance based on domain and category
   */
  private calculateImportance(
    domain: string,
    category: SubscriptionCategory
  ): 'high' | 'medium' | 'low' {
    // High importance categories
    if (['transactional', 'alerts'].includes(category)) {
      return 'high';
    }

    // Known important domains
    const importantDomains = ['github.com', 'google.com', 'apple.com', 'microsoft.com'];
    if (importantDomains.some(d => domain.includes(d))) {
      return 'high';
    }

    // Low importance categories
    if (['marketing', 'promotions'].includes(category)) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Calculate spam score
   */
  private calculateSpamScore(email: { subject: string; body: string }): number {
    let score = 0;
    const content = `${email.subject} ${email.body}`.toLowerCase();

    // Spam indicators
    const spamPatterns = [
      { pattern: /urgent|紧急|立即|limited time/i, weight: 10 },
      { pattern: /free|免费|0元/i, weight: 5 },
      { pattern: /winner|中奖|恭喜/i, weight: 15 },
      { pattern: /click here|点击这里/i, weight: 5 },
      { pattern: /\$\$\$|¥¥¥/i, weight: 10 },
      { pattern: /buy now|立即购买/i, weight: 5 },
      { pattern: /100%|guarantee|保证/i, weight: 5 },
      { pattern: /!!+|\?\?+/i, weight: 5 },
      { pattern: /ALL CAPS WORDS/g, weight: 5 },
    ];

    for (const { pattern, weight } of spamPatterns) {
      if (pattern.test(content)) {
        score += weight;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Extract sender name from email address
   */
  private extractSenderName(from: string): string {
    // Try to extract display name
    const match = from.match(/^"?([^"<]+)"?\s*</);
    if (match) return match[1].trim();

    // Use email username
    return from.split('@')[0].replace(/[._-]/g, ' ');
  }

  /**
   * Update frequency based on email history
   */
  private updateFrequency(subscription: EmailSubscription): void {
    const daysDiff = Math.max(
      1,
      (subscription.lastReceived.getTime() - subscription.firstReceived.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    subscription.avgPerWeek = (subscription.totalReceived / daysDiff) * 7;

    if (subscription.avgPerWeek >= 5) {
      subscription.frequency = 'daily';
    } else if (subscription.avgPerWeek >= 0.8) {
      subscription.frequency = 'weekly';
    } else if (subscription.avgPerWeek >= 0.2) {
      subscription.frequency = 'monthly';
    } else {
      subscription.frequency = 'irregular';
    }
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(
    filter?: {
      status?: EmailSubscription['status'];
      category?: SubscriptionCategory;
      importance?: EmailSubscription['importance'];
    }
  ): EmailSubscription[] {
    let result = Array.from(subscriptions.values());

    if (filter?.status) {
      result = result.filter(s => s.status === filter.status);
    }
    if (filter?.category) {
      result = result.filter(s => s.category === filter.category);
    }
    if (filter?.importance) {
      result = result.filter(s => s.importance === filter.importance);
    }

    return result.sort((a, b) => b.avgPerWeek - a.avgPerWeek);
  }

  /**
   * Unsubscribe from a subscription
   */
  async unsubscribe(subscriptionId: string): Promise<UnsubscribeResult> {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) {
      return {
        subscriptionId,
        success: false,
        method: 'manual',
        message: '订阅不存在',
        timestamp: new Date(),
      };
    }

    let result: UnsubscribeResult;

    // Try different unsubscribe methods
    if (subscription.unsubscribeLink) {
      // In production, would actually make the request
      result = {
        subscriptionId,
        success: true,
        method: 'link',
        message: `已通过链接退订: ${subscription.senderName}`,
        timestamp: new Date(),
      };
    } else if (subscription.unsubscribeEmail) {
      // In production, would send unsubscribe email
      result = {
        subscriptionId,
        success: true,
        method: 'email',
        message: `已发送退订邮件至: ${subscription.unsubscribeEmail}`,
        timestamp: new Date(),
      };
    } else {
      result = {
        subscriptionId,
        success: false,
        method: 'manual',
        message: '需要手动退订，未找到自动退订方式',
        timestamp: new Date(),
      };
    }

    // Update subscription status
    if (result.success) {
      subscription.status = 'unsubscribed';
      subscription.lastAction = { type: 'unsubscribe', date: new Date() };
    }

    // Record history
    const history = unsubscribeHistory.get(subscriptionId) || [];
    history.push(result);
    unsubscribeHistory.set(subscriptionId, history);

    return result;
  }

  /**
   * Bulk unsubscribe
   */
  async bulkUnsubscribe(subscriptionIds: string[]): Promise<BulkUnsubscribeJob> {
    const job: BulkUnsubscribeJob = {
      id: `job_${Date.now()}`,
      subscriptionIds,
      status: 'in_progress',
      progress: 0,
      results: [],
      startedAt: new Date(),
    };

    bulkJobs.set(job.id, job);

    // Process each subscription
    for (let i = 0; i < subscriptionIds.length; i++) {
      const result = await this.unsubscribe(subscriptionIds[i]);
      job.results.push(result);
      job.progress = ((i + 1) / subscriptionIds.length) * 100;
    }

    job.status = 'completed';
    job.completedAt = new Date();

    return job;
  }

  /**
   * Block sender
   */
  blockSender(subscriptionId: string): EmailSubscription | null {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) return null;

    subscription.status = 'blocked';
    subscription.lastAction = { type: 'block', date: new Date() };

    return subscription;
  }

  /**
   * Get subscription analytics
   */
  getAnalytics(): SubscriptionAnalytics {
    const allSubs = Array.from(subscriptions.values());
    const active = allSubs.filter(s => s.status === 'active');

    // Count by category
    const byCategory: Record<string, number> = {} as any;
    active.forEach(s => {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    });

    // Top senders
    const topSenders = active
      .sort((a, b) => b.totalReceived - a.totalReceived)
      .slice(0, 10)
      .map(s => ({
        sender: s.senderName,
        count: s.totalReceived,
        readRate: s.readRate,
      }));

    // Weekly volume
    const weeklyEmailVolume = active.reduce((sum, s) => sum + s.avgPerWeek, 0);

    // Time saved estimate (30 seconds per unread email)
    const lowEngagementEmails = active
      .filter(s => s.readRate < 20)
      .reduce((sum, s) => sum + s.avgPerWeek, 0);
    const potentialTimeSaved = Math.round(lowEngagementEmails * 0.5); // minutes

    // Generate recommendations
    const recommendations = this.generateRecommendations(active);

    return {
      totalSubscriptions: allSubs.length,
      activeSubscriptions: active.length,
      unsubscribedCount: allSubs.filter(s => s.status === 'unsubscribed').length,
      blockedCount: allSubs.filter(s => s.status === 'blocked').length,
      byCategory: byCategory as Record<SubscriptionCategory, number>,
      topSenders,
      weeklyEmailVolume: Math.round(weeklyEmailVolume),
      potentialTimeSaved,
      recommendations,
    };
  }

  /**
   * Generate unsubscribe recommendations
   */
  private generateRecommendations(
    subscriptions: EmailSubscription[]
  ): SubscriptionAnalytics['recommendations'] {
    const recommendations: SubscriptionAnalytics['recommendations'] = [];

    for (const sub of subscriptions) {
      // Never opened
      if (sub.readRate === 0 && sub.totalReceived >= 5) {
        recommendations.push({
          type: 'unsubscribe',
          subscription: sub,
          reason: `您从未打开过来自 ${sub.senderName} 的邮件`,
        });
        continue;
      }

      // High spam score
      if (sub.spamScore >= 50) {
        recommendations.push({
          type: 'unsubscribe',
          subscription: sub,
          reason: `来自 ${sub.senderName} 的邮件疑似垃圾邮件`,
        });
        continue;
      }

      // Low engagement, high volume
      if (sub.readRate < 10 && sub.avgPerWeek >= 3) {
        recommendations.push({
          type: 'unsubscribe',
          subscription: sub,
          reason: `每周收到 ${Math.round(sub.avgPerWeek)} 封，但很少阅读`,
        });
        continue;
      }

      // Moderate engagement
      if (sub.readRate < 30 && sub.avgPerWeek >= 2) {
        recommendations.push({
          type: 'reduce',
          subscription: sub,
          reason: `可以考虑减少来自 ${sub.senderName} 的邮件频率`,
        });
      }

      // High engagement - recommend keeping
      if (sub.readRate > 70) {
        recommendations.push({
          type: 'keep',
          subscription: sub,
          reason: `来自 ${sub.senderName} 的邮件阅读率高`,
        });
      }
    }

    // Sort by type priority (unsubscribe > reduce > keep)
    const typePriority = { unsubscribe: 0, reduce: 1, keep: 2 };
    return recommendations.sort((a, b) => typePriority[a.type] - typePriority[b.type]);
  }

  /**
   * Get subscription insights
   */
  getInsights(): SubscriptionInsight[] {
    const active = Array.from(subscriptions.values()).filter(s => s.status === 'active');
    const insights: SubscriptionInsight[] = [];

    // Unused subscriptions
    const unused = active.filter(s => s.readRate === 0 && s.totalReceived >= 3);
    if (unused.length > 0) {
      insights.push({
        type: 'unused',
        title: '从未阅读的订阅',
        description: `您有 ${unused.length} 个订阅从未打开过`,
        subscriptions: unused,
        suggestedAction: '建议退订这些邮件列表',
      });
    }

    // Spam likely
    const spamLikely = active.filter(s => s.spamScore >= 40);
    if (spamLikely.length > 0) {
      insights.push({
        type: 'spam_likely',
        title: '疑似垃圾邮件',
        description: `${spamLikely.length} 个订阅可能是垃圾邮件`,
        subscriptions: spamLikely,
        suggestedAction: '建议检查并退订或拉黑',
      });
    }

    // High volume
    const highVolume = active.filter(s => s.avgPerWeek >= 5);
    if (highVolume.length > 0) {
      insights.push({
        type: 'high_volume',
        title: '高频发送者',
        description: `${highVolume.length} 个订阅每周发送超过5封邮件`,
        subscriptions: highVolume,
        suggestedAction: '考虑调整接收频率或退订',
      });
    }

    // Low engagement
    const lowEngagement = active.filter(s => s.readRate < 20 && s.totalReceived >= 5);
    if (lowEngagement.length > 0) {
      insights.push({
        type: 'low_engagement',
        title: '低互动订阅',
        description: `${lowEngagement.length} 个订阅的阅读率低于20%`,
        subscriptions: lowEngagement,
        suggestedAction: '建议评估是否需要继续订阅',
      });
    }

    // Valuable
    const valuable = active.filter(s => s.readRate > 80);
    if (valuable.length > 0) {
      insights.push({
        type: 'valuable',
        title: '高价值订阅',
        description: `${valuable.length} 个订阅阅读率超过80%`,
        subscriptions: valuable,
        suggestedAction: '保持这些订阅',
      });
    }

    return insights;
  }

  /**
   * Update read/interaction stats
   */
  recordInteraction(
    subscriptionId: string,
    action: 'open' | 'click' | 'reply'
  ): void {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Simple weighted update
    const weight = 1 / Math.max(subscription.totalReceived, 1);

    if (action === 'open') {
      subscription.readRate = subscription.readRate * (1 - weight) + 100 * weight;
    }
    if (['click', 'reply'].includes(action)) {
      subscription.interactionRate = subscription.interactionRate * (1 - weight) + 100 * weight;
    }
  }

  /**
   * Get bulk job status
   */
  getBulkJobStatus(jobId: string): BulkUnsubscribeJob | null {
    return bulkJobs.get(jobId) || null;
  }
}

export const smartUnsubscribeService = new SmartUnsubscribeService();
