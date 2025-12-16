/**
 * Analytics Service
 *
 * Tracks and analyzes email patterns, user behavior,
 * and AI usage for insights and optimization.
 */

import { logger } from '../../utils/logger.js';

interface EmailMetric {
  timestamp: Date;
  type: 'sent' | 'received' | 'replied' | 'forwarded' | 'archived';
  responseTime?: number; // minutes
  sentiment?: string;
  category?: string;
  aiAssisted?: boolean;
}

interface AIUsageMetric {
  timestamp: Date;
  feature: 'reply' | 'compose' | 'summarize' | 'improve' | 'analyze' | 'translate';
  tokensUsed: number;
  responseTime: number; // ms
  success: boolean;
  userRating?: number; // 1-5
}

interface UserAnalytics {
  userId: string;
  emailMetrics: EmailMetric[];
  aiUsageMetrics: AIUsageMetric[];
  startDate: Date;
}

interface DailyStats {
  date: string;
  emailsSent: number;
  emailsReceived: number;
  emailsReplied: number;
  averageResponseTime: number;
  aiRequestsCount: number;
  tokensUsed: number;
  timeSaved: number; // estimated minutes
}

interface ResponseTimeAnalysis {
  overall: {
    average: number;
    median: number;
    fastest: number;
    slowest: number;
  };
  byHour: Record<number, number>;
  byDayOfWeek: Record<string, number>;
  trend: 'improving' | 'stable' | 'declining';
}

interface CommunicationInsights {
  topContacts: ContactInsight[];
  busiestHours: { hour: number; count: number }[];
  busiestDays: { day: string; count: number }[];
  sentimentTrend: { date: string; sentiment: number }[];
  categoryBreakdown: Record<string, number>;
}

interface ContactInsight {
  email: string;
  name?: string;
  emailCount: number;
  averageResponseTime: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  lastContact: Date;
  relationshipStrength: 'strong' | 'moderate' | 'weak';
}

interface ProductivityScore {
  overall: number; // 0-100
  components: {
    responseSpeed: number;
    emailVolume: number;
    inboxZeroProgress: number;
    aiUtilization: number;
    consistency: number;
  };
  comparison: {
    vsLastWeek: number;
    vsLastMonth: number;
  };
  recommendations: string[];
}

interface AIInsights {
  totalRequests: number;
  totalTokensUsed: number;
  estimatedTimeSaved: number; // minutes
  mostUsedFeature: string;
  featureBreakdown: Record<string, number>;
  averageRating: number;
  successRate: number;
  costEstimate: number; // USD
}

export class AnalyticsService {
  private userAnalytics: Map<string, UserAnalytics> = new Map();

  /**
   * Get or create user analytics
   */
  private getOrCreateAnalytics(userId: string): UserAnalytics {
    if (!this.userAnalytics.has(userId)) {
      this.userAnalytics.set(userId, {
        userId,
        emailMetrics: [],
        aiUsageMetrics: [],
        startDate: new Date(),
      });
    }
    return this.userAnalytics.get(userId)!;
  }

  /**
   * Track email event
   */
  trackEmail(userId: string, metric: Omit<EmailMetric, 'timestamp'>): void {
    const analytics = this.getOrCreateAnalytics(userId);
    analytics.emailMetrics.push({
      ...metric,
      timestamp: new Date(),
    });

    // Keep only last 10000 metrics
    if (analytics.emailMetrics.length > 10000) {
      analytics.emailMetrics = analytics.emailMetrics.slice(-10000);
    }

    logger.debug({ msg: 'Email metric tracked', userId, type: metric.type });
  }

  /**
   * Track AI usage
   */
  trackAIUsage(userId: string, metric: Omit<AIUsageMetric, 'timestamp'>): void {
    const analytics = this.getOrCreateAnalytics(userId);
    analytics.aiUsageMetrics.push({
      ...metric,
      timestamp: new Date(),
    });

    // Keep only last 5000 metrics
    if (analytics.aiUsageMetrics.length > 5000) {
      analytics.aiUsageMetrics = analytics.aiUsageMetrics.slice(-5000);
    }

    logger.debug({ msg: 'AI usage tracked', userId, feature: metric.feature });
  }

  /**
   * Get daily statistics
   */
  getDailyStats(userId: string, days: number = 30): DailyStats[] {
    const analytics = this.getOrCreateAnalytics(userId);
    const stats: Map<string, DailyStats> = new Map();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      stats.set(dateStr, {
        date: dateStr,
        emailsSent: 0,
        emailsReceived: 0,
        emailsReplied: 0,
        averageResponseTime: 0,
        aiRequestsCount: 0,
        tokensUsed: 0,
        timeSaved: 0,
      });
    }

    // Aggregate email metrics
    for (const metric of analytics.emailMetrics) {
      const dateStr = metric.timestamp.toISOString().split('T')[0];
      const stat = stats.get(dateStr);
      if (!stat) continue;

      switch (metric.type) {
        case 'sent':
          stat.emailsSent++;
          break;
        case 'received':
          stat.emailsReceived++;
          break;
        case 'replied':
          stat.emailsReplied++;
          if (metric.responseTime) {
            stat.averageResponseTime =
              (stat.averageResponseTime * (stat.emailsReplied - 1) + metric.responseTime) / stat.emailsReplied;
          }
          break;
      }
    }

    // Aggregate AI metrics
    for (const metric of analytics.aiUsageMetrics) {
      const dateStr = metric.timestamp.toISOString().split('T')[0];
      const stat = stats.get(dateStr);
      if (!stat) continue;

      stat.aiRequestsCount++;
      stat.tokensUsed += metric.tokensUsed;
      // Estimate time saved (average 2 minutes per AI request)
      if (metric.success) {
        stat.timeSaved += 2;
      }
    }

    return Array.from(stats.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Analyze response time patterns
   */
  getResponseTimeAnalysis(userId: string): ResponseTimeAnalysis {
    const analytics = this.getOrCreateAnalytics(userId);
    const responseTimes = analytics.emailMetrics
      .filter(m => m.type === 'replied' && m.responseTime)
      .map(m => ({ time: m.responseTime!, timestamp: m.timestamp }));

    if (responseTimes.length === 0) {
      return {
        overall: { average: 0, median: 0, fastest: 0, slowest: 0 },
        byHour: {},
        byDayOfWeek: {},
        trend: 'stable',
      };
    }

    const times = responseTimes.map(r => r.time).sort((a, b) => a - b);

    // Calculate overall stats
    const overall = {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      fastest: times[0],
      slowest: times[times.length - 1],
    };

    // By hour
    const byHour: Record<number, number[]> = {};
    for (const r of responseTimes) {
      const hour = r.timestamp.getHours();
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(r.time);
    }
    const avgByHour: Record<number, number> = {};
    for (const [hour, times] of Object.entries(byHour)) {
      avgByHour[Number(hour)] = times.reduce((a, b) => a + b, 0) / times.length;
    }

    // By day of week
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDayOfWeek: Record<string, number[]> = {};
    for (const r of responseTimes) {
      const day = days[r.timestamp.getDay()];
      if (!byDayOfWeek[day]) byDayOfWeek[day] = [];
      byDayOfWeek[day].push(r.time);
    }
    const avgByDay: Record<string, number> = {};
    for (const [day, times] of Object.entries(byDayOfWeek)) {
      avgByDay[day] = times.reduce((a, b) => a + b, 0) / times.length;
    }

    // Calculate trend (compare last 7 days vs previous 7 days)
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const lastWeek = responseTimes.filter(r => r.timestamp.getTime() > weekAgo);
    const prevWeek = responseTimes.filter(
      r => r.timestamp.getTime() > twoWeeksAgo && r.timestamp.getTime() <= weekAgo
    );

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (lastWeek.length > 0 && prevWeek.length > 0) {
      const avgLastWeek = lastWeek.reduce((a, b) => a + b.time, 0) / lastWeek.length;
      const avgPrevWeek = prevWeek.reduce((a, b) => a + b.time, 0) / prevWeek.length;
      if (avgLastWeek < avgPrevWeek * 0.9) trend = 'improving';
      else if (avgLastWeek > avgPrevWeek * 1.1) trend = 'declining';
    }

    return {
      overall,
      byHour: avgByHour,
      byDayOfWeek: avgByDay,
      trend,
    };
  }

  /**
   * Get communication insights
   */
  getCommunicationInsights(userId: string): CommunicationInsights {
    const analytics = this.getOrCreateAnalytics(userId);

    // Top contacts (simplified - track by email frequency)
    const contactCounts: Map<string, { count: number; sentiments: string[]; lastDate: Date }> = new Map();
    // This would be populated from actual email data in production

    // Busiest hours
    const hourCounts: Record<number, number> = {};
    for (const metric of analytics.emailMetrics) {
      const hour = metric.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const busiestHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: Number(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Busiest days
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts: Record<string, number> = {};
    for (const metric of analytics.emailMetrics) {
      const day = days[metric.timestamp.getDay()];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    const busiestDays = Object.entries(dayCounts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    // Sentiment trend (last 30 days)
    const sentimentByDate: Map<string, { positive: number; negative: number; total: number }> = new Map();
    for (const metric of analytics.emailMetrics) {
      if (!metric.sentiment) continue;
      const dateStr = metric.timestamp.toISOString().split('T')[0];
      const existing = sentimentByDate.get(dateStr) || { positive: 0, negative: 0, total: 0 };
      existing.total++;
      if (metric.sentiment === 'positive') existing.positive++;
      else if (metric.sentiment === 'negative') existing.negative++;
      sentimentByDate.set(dateStr, existing);
    }
    const sentimentTrend = Array.from(sentimentByDate.entries())
      .map(([date, data]) => ({
        date,
        sentiment: data.total > 0 ? (data.positive - data.negative) / data.total : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const metric of analytics.emailMetrics) {
      if (metric.category) {
        categoryBreakdown[metric.category] = (categoryBreakdown[metric.category] || 0) + 1;
      }
    }

    return {
      topContacts: [], // Would be populated with real contact data
      busiestHours,
      busiestDays,
      sentimentTrend,
      categoryBreakdown,
    };
  }

  /**
   * Calculate productivity score
   */
  getProductivityScore(userId: string): ProductivityScore {
    const analytics = this.getOrCreateAnalytics(userId);
    const dailyStats = this.getDailyStats(userId, 7);
    const responseAnalysis = this.getResponseTimeAnalysis(userId);

    // Calculate component scores
    const responseSpeed = Math.max(0, 100 - responseAnalysis.overall.average / 10); // Lower is better
    const emailVolume = Math.min(100, dailyStats.reduce((a, d) => a + d.emailsReplied, 0) * 5);
    const aiUtilization = Math.min(100, dailyStats.reduce((a, d) => a + d.aiRequestsCount, 0) * 10);

    // Calculate inbox zero progress (placeholder)
    const inboxZeroProgress = 70;

    // Calculate consistency (variance in daily activity)
    const dailyReplies = dailyStats.map(d => d.emailsReplied);
    const avgReplies = dailyReplies.reduce((a, b) => a + b, 0) / dailyReplies.length;
    const variance = dailyReplies.reduce((a, b) => a + Math.pow(b - avgReplies, 2), 0) / dailyReplies.length;
    const consistency = Math.max(0, 100 - variance);

    // Overall score (weighted average)
    const overall = Math.round(
      responseSpeed * 0.25 +
      emailVolume * 0.2 +
      inboxZeroProgress * 0.2 +
      aiUtilization * 0.15 +
      consistency * 0.2
    );

    // Generate recommendations
    const recommendations: string[] = [];
    if (responseSpeed < 50) {
      recommendations.push('Try to respond to emails within 24 hours for better relationships');
    }
    if (aiUtilization < 30) {
      recommendations.push('Use AI features more to save time on routine emails');
    }
    if (consistency < 50) {
      recommendations.push('Try to maintain a consistent email routine');
    }

    // Compare to previous periods (placeholder values)
    const vsLastWeek = 5;
    const vsLastMonth = 10;

    return {
      overall,
      components: {
        responseSpeed,
        emailVolume,
        inboxZeroProgress,
        aiUtilization,
        consistency,
      },
      comparison: {
        vsLastWeek,
        vsLastMonth,
      },
      recommendations,
    };
  }

  /**
   * Get AI usage insights
   */
  getAIInsights(userId: string): AIInsights {
    const analytics = this.getOrCreateAnalytics(userId);
    const metrics = analytics.aiUsageMetrics;

    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        totalTokensUsed: 0,
        estimatedTimeSaved: 0,
        mostUsedFeature: 'none',
        featureBreakdown: {},
        averageRating: 0,
        successRate: 0,
        costEstimate: 0,
      };
    }

    // Calculate stats
    const totalRequests = metrics.length;
    const totalTokensUsed = metrics.reduce((a, m) => a + m.tokensUsed, 0);
    const successfulRequests = metrics.filter(m => m.success).length;
    const successRate = successfulRequests / totalRequests;

    // Estimated time saved (2 min per successful request)
    const estimatedTimeSaved = successfulRequests * 2;

    // Feature breakdown
    const featureBreakdown: Record<string, number> = {};
    for (const metric of metrics) {
      featureBreakdown[metric.feature] = (featureBreakdown[metric.feature] || 0) + 1;
    }

    // Most used feature
    const mostUsedFeature = Object.entries(featureBreakdown)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    // Average rating
    const ratedMetrics = metrics.filter(m => m.userRating);
    const averageRating = ratedMetrics.length > 0
      ? ratedMetrics.reduce((a, m) => a + m.userRating!, 0) / ratedMetrics.length
      : 0;

    // Cost estimate (approximate: $0.002 per 1K tokens)
    const costEstimate = (totalTokensUsed / 1000) * 0.002;

    return {
      totalRequests,
      totalTokensUsed,
      estimatedTimeSaved,
      mostUsedFeature,
      featureBreakdown,
      averageRating,
      successRate: Math.round(successRate * 100),
      costEstimate: Math.round(costEstimate * 100) / 100,
    };
  }

  /**
   * Export analytics data
   */
  exportAnalytics(userId: string): {
    dailyStats: DailyStats[];
    responseTimeAnalysis: ResponseTimeAnalysis;
    communicationInsights: CommunicationInsights;
    productivityScore: ProductivityScore;
    aiInsights: AIInsights;
    exportedAt: Date;
  } {
    return {
      dailyStats: this.getDailyStats(userId, 30),
      responseTimeAnalysis: this.getResponseTimeAnalysis(userId),
      communicationInsights: this.getCommunicationInsights(userId),
      productivityScore: this.getProductivityScore(userId),
      aiInsights: this.getAIInsights(userId),
      exportedAt: new Date(),
    };
  }
}

export const analyticsService = new AnalyticsService();
