/**
 * Email Health Score Service
 * Track email habits and provide wellness recommendations
 */

import { AIService } from '../ai/index.js';

export interface DailyEmailStats {
  date: Date;
  sent: number;
  received: number;
  replied: number;
  avgResponseTime: number; // minutes
  afterHoursEmails: number;
  weekendEmails: number;
  longestThread: number;
  shortestResponse: number;
  longestDraft: number; // time spent drafting
}

export interface EmailHealthScore {
  overall: number; // 0-100
  breakdown: {
    responsiveness: number;
    workLifeBalance: number;
    emailQuality: number;
    inboxManagement: number;
    communicationEfficiency: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  comparedToLastWeek: number; // percentage change
}

export interface EmailAnxietyIndex {
  score: number; // 0-100, higher = more anxiety
  indicators: Array<{
    factor: string;
    contribution: number;
    suggestion: string;
  }>;
  peakAnxietyTimes: string[];
  calmPeriods: string[];
}

export interface WellnessRecommendation {
  id: string;
  category: 'work_life_balance' | 'productivity' | 'communication' | 'mental_health';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  action?: string;
}

export interface EmailHabitAnalysis {
  patterns: {
    peakProductivityHours: number[];
    averageEmailLength: number;
    responseTimeByPriority: Record<string, number>;
    topCommunicators: Array<{ email: string; count: number }>;
    commonTopics: string[];
  };
  habits: {
    good: string[];
    needsImprovement: string[];
  };
  goals: {
    current: string[];
    suggested: string[];
  };
}

export interface WeeklyReport {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  healthScore: EmailHealthScore;
  anxietyIndex: EmailAnxietyIndex;
  stats: {
    totalSent: number;
    totalReceived: number;
    avgDailyEmails: number;
    inboxZeroAchieved: number; // days
    longestStreak: number;
  };
  highlights: string[];
  recommendations: WellnessRecommendation[];
  comparison: {
    vsLastWeek: Record<string, number>;
    vsAverage: Record<string, number>;
  };
}

// In-memory storage
const dailyStats = new Map<string, DailyEmailStats[]>();
const userGoals = new Map<string, string[]>();

export class EmailHealthService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Record daily email activity
   */
  recordDailyStats(userId: string, stats: Omit<DailyEmailStats, 'date'>): void {
    let userStats = dailyStats.get(userId);
    if (!userStats) {
      userStats = [];
      dailyStats.set(userId, userStats);
    }

    userStats.push({
      ...stats,
      date: new Date(),
    });

    // Keep last 90 days
    if (userStats.length > 90) {
      userStats.shift();
    }
  }

  /**
   * Calculate email health score
   */
  calculateHealthScore(userId: string): EmailHealthScore {
    const stats = dailyStats.get(userId) || [];
    const recentStats = stats.slice(-7); // Last 7 days

    if (recentStats.length === 0) {
      return {
        overall: 70,
        breakdown: {
          responsiveness: 70,
          workLifeBalance: 70,
          emailQuality: 70,
          inboxManagement: 70,
          communicationEfficiency: 70,
        },
        trend: 'stable',
        comparedToLastWeek: 0,
      };
    }

    // Calculate individual scores
    const avgResponseTime = recentStats.reduce((s, d) => s + d.avgResponseTime, 0) / recentStats.length;
    const responsiveness = Math.max(0, 100 - avgResponseTime / 60 * 10); // Lower response time = higher score

    const afterHoursRatio = recentStats.reduce((s, d) => s + d.afterHoursEmails, 0) /
      Math.max(1, recentStats.reduce((s, d) => s + d.sent, 0));
    const weekendRatio = recentStats.reduce((s, d) => s + d.weekendEmails, 0) /
      Math.max(1, recentStats.reduce((s, d) => s + d.sent, 0));
    const workLifeBalance = Math.max(0, 100 - afterHoursRatio * 50 - weekendRatio * 30);

    const avgEmailsPerDay = recentStats.reduce((s, d) => s + d.sent + d.received, 0) / recentStats.length;
    const communicationEfficiency = avgEmailsPerDay > 100 ? 60 : avgEmailsPerDay > 50 ? 80 : 90;

    const replyRate = recentStats.reduce((s, d) => s + d.replied, 0) /
      Math.max(1, recentStats.reduce((s, d) => s + d.received, 0));
    const inboxManagement = Math.min(100, replyRate * 100 + 20);

    const emailQuality = 75; // Would need content analysis

    const overall = Math.round(
      responsiveness * 0.25 +
      workLifeBalance * 0.25 +
      emailQuality * 0.15 +
      inboxManagement * 0.2 +
      communicationEfficiency * 0.15
    );

    // Calculate trend
    const olderStats = stats.slice(-14, -7);
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let comparedToLastWeek = 0;

    if (olderStats.length > 0) {
      const oldOverall = this.calculateSimpleScore(olderStats);
      comparedToLastWeek = ((overall - oldOverall) / oldOverall) * 100;
      trend = comparedToLastWeek > 5 ? 'improving' : comparedToLastWeek < -5 ? 'declining' : 'stable';
    }

    return {
      overall,
      breakdown: {
        responsiveness: Math.round(responsiveness),
        workLifeBalance: Math.round(workLifeBalance),
        emailQuality: Math.round(emailQuality),
        inboxManagement: Math.round(inboxManagement),
        communicationEfficiency: Math.round(communicationEfficiency),
      },
      trend,
      comparedToLastWeek: Math.round(comparedToLastWeek),
    };
  }

  private calculateSimpleScore(stats: DailyEmailStats[]): number {
    if (stats.length === 0) return 70;
    const avgResponseTime = stats.reduce((s, d) => s + d.avgResponseTime, 0) / stats.length;
    return Math.max(0, 100 - avgResponseTime / 60 * 10);
  }

  /**
   * Calculate email anxiety index
   */
  calculateAnxietyIndex(userId: string): EmailAnxietyIndex {
    const stats = dailyStats.get(userId) || [];
    const recentStats = stats.slice(-7);

    const indicators: EmailAnxietyIndex['indicators'] = [];
    let totalScore = 0;

    // Check for after-hours emails
    const afterHoursTotal = recentStats.reduce((s, d) => s + d.afterHoursEmails, 0);
    if (afterHoursTotal > 10) {
      const contribution = Math.min(25, afterHoursTotal);
      totalScore += contribution;
      indicators.push({
        factor: '下班后发送邮件',
        contribution,
        suggestion: '尝试使用定时发送功能，在工作时间发送邮件',
      });
    }

    // Check for weekend emails
    const weekendTotal = recentStats.reduce((s, d) => s + d.weekendEmails, 0);
    if (weekendTotal > 5) {
      const contribution = Math.min(20, weekendTotal);
      totalScore += contribution;
      indicators.push({
        factor: '周末处理邮件',
        contribution,
        suggestion: '周末尽量不查看工作邮件，保护个人时间',
      });
    }

    // Check for email volume
    const avgDaily = recentStats.reduce((s, d) => s + d.received, 0) / Math.max(1, recentStats.length);
    if (avgDaily > 50) {
      const contribution = Math.min(30, (avgDaily - 50) / 2);
      totalScore += contribution;
      indicators.push({
        factor: '邮件数量过多',
        contribution,
        suggestion: '考虑使用过滤器和规则自动处理低优先级邮件',
      });
    }

    // Check for quick response pressure
    const avgResponseTime = recentStats.reduce((s, d) => s + d.avgResponseTime, 0) / Math.max(1, recentStats.length);
    if (avgResponseTime < 10) {
      const contribution = 15;
      totalScore += contribution;
      indicators.push({
        factor: '回复过于即时',
        contribution,
        suggestion: '不必立即回复每封邮件，设置合理的响应时间预期',
      });
    }

    return {
      score: Math.min(100, totalScore),
      indicators,
      peakAnxietyTimes: ['周一早上', '周五下午'],
      calmPeriods: ['周三', '午休时间'],
    };
  }

  /**
   * Generate wellness recommendations
   */
  async generateRecommendations(userId: string): Promise<WellnessRecommendation[]> {
    const healthScore = this.calculateHealthScore(userId);
    const anxietyIndex = this.calculateAnxietyIndex(userId);
    const recommendations: WellnessRecommendation[] = [];

    // Work-life balance recommendations
    if (healthScore.breakdown.workLifeBalance < 60) {
      recommendations.push({
        id: `rec_${Date.now()}_1`,
        category: 'work_life_balance',
        title: '设置邮件边界',
        description: '您的工作生活平衡评分较低。建议设置"工作时间"，在非工作时间关闭邮件通知。',
        priority: 'high',
        actionable: true,
        action: '开启勿扰模式：晚上8点-早上8点',
      });
    }

    // Responsiveness recommendations
    if (healthScore.breakdown.responsiveness < 50) {
      recommendations.push({
        id: `rec_${Date.now()}_2`,
        category: 'productivity',
        title: '提高响应效率',
        description: '您的邮件响应时间较长。考虑使用智能回复或模板来加速常见回复。',
        priority: 'medium',
        actionable: true,
        action: '启用智能快速回复功能',
      });
    }

    // Anxiety recommendations
    if (anxietyIndex.score > 60) {
      recommendations.push({
        id: `rec_${Date.now()}_3`,
        category: 'mental_health',
        title: '减少邮件焦虑',
        description: '您的邮件焦虑指数较高。建议固定时间段处理邮件，而不是实时响应。',
        priority: 'high',
        actionable: true,
        action: '设置每日3个固定邮件处理时段',
      });
    }

    // Inbox management
    if (healthScore.breakdown.inboxManagement < 60) {
      recommendations.push({
        id: `rec_${Date.now()}_4`,
        category: 'productivity',
        title: '改善收件箱管理',
        description: '您的收件箱管理评分较低。尝试使用"两分钟规则"：能在两分钟内处理的邮件立即处理。',
        priority: 'medium',
        actionable: true,
        action: '启用智能分类和优先级标记',
      });
    }

    return recommendations;
  }

  /**
   * Analyze email habits
   */
  async analyzeHabits(userId: string): Promise<EmailHabitAnalysis> {
    const stats = dailyStats.get(userId) || [];

    // Find peak productivity hours (simplified)
    const peakHours = [9, 10, 14, 15]; // Default peaks

    // Get current goals
    const goals = userGoals.get(userId) || [];

    return {
      patterns: {
        peakProductivityHours: peakHours,
        averageEmailLength: 150, // Would need actual data
        responseTimeByPriority: {
          urgent: 15,
          high: 60,
          normal: 240,
          low: 480,
        },
        topCommunicators: [],
        commonTopics: ['项目更新', '会议安排', '审批请求'],
      },
      habits: {
        good: [
          '回复速度较快',
          '邮件简洁明了',
          '善用主题行',
        ],
        needsImprovement: [
          '减少周末邮件',
          '避免即时回复的压力',
          '定期清理收件箱',
        ],
      },
      goals: {
        current: goals,
        suggested: [
          '每天达到 Inbox Zero 一次',
          '响应时间控制在4小时内',
          '下班后不处理邮件',
        ],
      },
    };
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(userId: string): Promise<WeeklyReport> {
    const healthScore = this.calculateHealthScore(userId);
    const anxietyIndex = this.calculateAnxietyIndex(userId);
    const recommendations = await this.generateRecommendations(userId);
    const stats = dailyStats.get(userId) || [];
    const weekStats = stats.slice(-7);

    const totalSent = weekStats.reduce((s, d) => s + d.sent, 0);
    const totalReceived = weekStats.reduce((s, d) => s + d.received, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    return {
      userId,
      weekStart,
      weekEnd: new Date(),
      healthScore,
      anxietyIndex,
      stats: {
        totalSent,
        totalReceived,
        avgDailyEmails: (totalSent + totalReceived) / 7,
        inboxZeroAchieved: 2, // Simulated
        longestStreak: 3,
      },
      highlights: [
        `本周共处理 ${totalSent + totalReceived} 封邮件`,
        `健康评分 ${healthScore.overall} 分`,
        healthScore.trend === 'improving' ? '📈 评分持续上升' : healthScore.trend === 'declining' ? '📉 需要关注工作习惯' : '➡️ 保持稳定',
      ],
      recommendations,
      comparison: {
        vsLastWeek: {
          emails: 5,
          responseTime: -10,
          healthScore: healthScore.comparedToLastWeek,
        },
        vsAverage: {
          emails: 0,
          responseTime: 0,
          healthScore: 0,
        },
      },
    };
  }

  /**
   * Set user goals
   */
  setGoals(userId: string, goals: string[]): void {
    userGoals.set(userId, goals);
  }

  /**
   * Get user goals
   */
  getGoals(userId: string): string[] {
    return userGoals.get(userId) || [];
  }
}

export const emailHealthService = new EmailHealthService();
