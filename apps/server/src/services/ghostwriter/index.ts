/**
 * Ghost Writer Mode Service
 * Fully autonomous email handling with human oversight
 */

import { AIService } from '../ai/index.js';

export type AutomationLevel = 'off' | 'suggest' | 'draft' | 'auto_send';

export interface GhostWriterConfig {
  userId: string;
  enabled: boolean;
  automationLevel: AutomationLevel;
  rules: AutomationRule[];
  workingHours: {
    enabled: boolean;
    start: number; // 0-23
    end: number;
    timezone: string;
    daysOfWeek: number[]; // 0-6
  };
  autoReplySettings: {
    maxRepliesPerDay: number;
    requireApprovalAbove: 'low' | 'medium' | 'high' | 'never';
    blockedSenders: string[];
    vipSenders: string[]; // Always require approval
  };
  personality: {
    baseStyle: string;
    customInstructions: string;
    signatureVariants: string[];
  };
  learningEnabled: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  action: RuleAction;
  enabled: boolean;
  stats: {
    triggered: number;
    approved: number;
    rejected: number;
  };
}

export interface RuleCondition {
  type: 'sender' | 'subject' | 'body' | 'time' | 'label' | 'importance';
  operator: 'contains' | 'equals' | 'regex' | 'starts_with' | 'ends_with';
  value: string;
  negate?: boolean;
}

export interface RuleAction {
  type: 'reply' | 'forward' | 'label' | 'archive' | 'delete' | 'escalate';
  template?: string;
  forwardTo?: string;
  label?: string;
  customInstructions?: string;
}

export interface AutoEmail {
  id: string;
  originalEmailId: string;
  originalEmail: {
    from: string;
    subject: string;
    body: string;
    receivedAt: Date;
  };
  generatedReply: {
    subject: string;
    body: string;
    generatedAt: Date;
  };
  status: 'pending_review' | 'approved' | 'rejected' | 'auto_sent' | 'modified_sent';
  automationLevel: AutomationLevel;
  triggeredRule?: string;
  confidence: number;
  importance: 'low' | 'medium' | 'high';
  reviewedAt?: Date;
  reviewedBy?: string;
  modifications?: string;
  feedback?: 'good' | 'needs_improvement' | 'wrong';
}

export interface DailyReport {
  date: Date;
  userId: string;
  stats: {
    emailsReceived: number;
    emailsProcessed: number;
    autoReplied: number;
    pendingReview: number;
    manuallyHandled: number;
  };
  categorySummary: Record<string, number>;
  importantEmails: Array<{
    from: string;
    subject: string;
    importance: string;
    status: string;
  }>;
  suggestedActions: string[];
  learningInsights: string[];
}

// In-memory storage
const userConfigs = new Map<string, GhostWriterConfig>();
const autoEmails = new Map<string, AutoEmail>();
const dailyStats = new Map<string, DailyReport>();

export class GhostWriterService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Get or create user configuration
   */
  getConfig(userId: string): GhostWriterConfig {
    let config = userConfigs.get(userId);

    if (!config) {
      config = this.createDefaultConfig(userId);
      userConfigs.set(userId, config);
    }

    return config;
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(userId: string): GhostWriterConfig {
    return {
      userId,
      enabled: false,
      automationLevel: 'suggest',
      rules: this.getDefaultRules(),
      workingHours: {
        enabled: true,
        start: 9,
        end: 18,
        timezone: 'Asia/Shanghai',
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      },
      autoReplySettings: {
        maxRepliesPerDay: 50,
        requireApprovalAbove: 'medium',
        blockedSenders: [],
        vipSenders: [],
      },
      personality: {
        baseStyle: 'professional',
        customInstructions: '',
        signatureVariants: [
          'Best regards',
          'Kind regards',
          'Thanks',
        ],
      },
      learningEnabled: true,
    };
  }

  /**
   * Get default automation rules
   */
  private getDefaultRules(): AutomationRule[] {
    return [
      {
        id: 'rule_meeting_request',
        name: '会议请求自动回复',
        priority: 1,
        conditions: [
          { type: 'subject', operator: 'contains', value: 'meeting' },
        ],
        action: {
          type: 'reply',
          template: 'meeting_response',
          customInstructions: '检查日历可用性，礼貌回复',
        },
        enabled: true,
        stats: { triggered: 0, approved: 0, rejected: 0 },
      },
      {
        id: 'rule_thank_you',
        name: '感谢邮件快速回复',
        priority: 2,
        conditions: [
          { type: 'subject', operator: 'contains', value: 'thank' },
        ],
        action: {
          type: 'reply',
          template: 'thank_you_response',
          customInstructions: '简短友好的回复',
        },
        enabled: true,
        stats: { triggered: 0, approved: 0, rejected: 0 },
      },
      {
        id: 'rule_newsletter',
        name: '自动归档新闻邮件',
        priority: 10,
        conditions: [
          { type: 'sender', operator: 'contains', value: 'newsletter' },
        ],
        action: {
          type: 'archive',
          label: 'newsletters',
        },
        enabled: true,
        stats: { triggered: 0, approved: 0, rejected: 0 },
      },
      {
        id: 'rule_urgent',
        name: '紧急邮件升级处理',
        priority: 0,
        conditions: [
          { type: 'subject', operator: 'contains', value: 'urgent' },
          { type: 'importance', operator: 'equals', value: 'high' },
        ],
        action: {
          type: 'escalate',
          customInstructions: '标记为重要，立即通知用户',
        },
        enabled: true,
        stats: { triggered: 0, approved: 0, rejected: 0 },
      },
    ];
  }

  /**
   * Update user configuration
   */
  updateConfig(userId: string, updates: Partial<GhostWriterConfig>): GhostWriterConfig {
    const config = this.getConfig(userId);
    const updated = { ...config, ...updates };
    userConfigs.set(userId, updated);
    return updated;
  }

  /**
   * Process incoming email
   */
  async processEmail(
    userId: string,
    email: {
      id: string;
      from: string;
      subject: string;
      body: string;
      receivedAt: Date;
      labels?: string[];
    }
  ): Promise<AutoEmail | null> {
    const config = this.getConfig(userId);

    if (!config.enabled) return null;

    // Check if sender is blocked
    if (config.autoReplySettings.blockedSenders.some(s =>
      email.from.toLowerCase().includes(s.toLowerCase())
    )) {
      return null;
    }

    // Find matching rule
    const matchingRule = this.findMatchingRule(email, config.rules);

    // Assess importance
    const importance = await this.assessImportance(email);

    // Check if VIP (always require approval)
    const isVip = config.autoReplySettings.vipSenders.some(s =>
      email.from.toLowerCase().includes(s.toLowerCase())
    );

    // Determine if should auto-process
    const shouldAutoProcess = this.shouldAutoProcess(config, importance, isVip);

    // Generate response
    const generatedReply = await this.generateReply(email, config, matchingRule);

    const autoEmail: AutoEmail = {
      id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalEmailId: email.id,
      originalEmail: {
        from: email.from,
        subject: email.subject,
        body: email.body,
        receivedAt: email.receivedAt,
      },
      generatedReply,
      status: shouldAutoProcess && config.automationLevel === 'auto_send'
        ? 'auto_sent'
        : 'pending_review',
      automationLevel: config.automationLevel,
      triggeredRule: matchingRule?.id,
      confidence: generatedReply.confidence || 0.7,
      importance,
    };

    autoEmails.set(autoEmail.id, autoEmail);

    // Update rule stats
    if (matchingRule) {
      matchingRule.stats.triggered++;
    }

    return autoEmail;
  }

  /**
   * Find matching automation rule
   */
  private findMatchingRule(
    email: { from: string; subject: string; body: string; labels?: string[] },
    rules: AutomationRule[]
  ): AutomationRule | null {
    const enabledRules = rules
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of enabledRules) {
      if (this.matchesAllConditions(email, rule.conditions)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Check if email matches all conditions
   */
  private matchesAllConditions(
    email: { from: string; subject: string; body: string; labels?: string[] },
    conditions: RuleCondition[]
  ): boolean {
    return conditions.every(condition => {
      let fieldValue = '';
      switch (condition.type) {
        case 'sender':
          fieldValue = email.from;
          break;
        case 'subject':
          fieldValue = email.subject;
          break;
        case 'body':
          fieldValue = email.body;
          break;
        case 'label':
          fieldValue = email.labels?.join(' ') || '';
          break;
        default:
          return false;
      }

      let matches = false;
      const lowerField = fieldValue.toLowerCase();
      const lowerValue = condition.value.toLowerCase();

      switch (condition.operator) {
        case 'contains':
          matches = lowerField.includes(lowerValue);
          break;
        case 'equals':
          matches = lowerField === lowerValue;
          break;
        case 'starts_with':
          matches = lowerField.startsWith(lowerValue);
          break;
        case 'ends_with':
          matches = lowerField.endsWith(lowerValue);
          break;
        case 'regex':
          try {
            matches = new RegExp(condition.value, 'i').test(fieldValue);
          } catch {
            matches = false;
          }
          break;
      }

      return condition.negate ? !matches : matches;
    });
  }

  /**
   * Assess email importance
   */
  private async assessImportance(
    email: { from: string; subject: string; body: string }
  ): Promise<'low' | 'medium' | 'high'> {
    const prompt = `评估这封邮件的重要程度：

发件人: ${email.from}
主题: ${email.subject}
内容: ${email.body.slice(0, 500)}

返回 JSON: {"importance": "low|medium|high", "reason": "原因"}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });

      const result = JSON.parse(response.replies[0].content);
      return result.importance;
    } catch {
      // Default to medium if analysis fails
      return 'medium';
    }
  }

  /**
   * Determine if should auto-process
   */
  private shouldAutoProcess(
    config: GhostWriterConfig,
    importance: 'low' | 'medium' | 'high',
    isVip: boolean
  ): boolean {
    if (isVip) return false;
    if (config.autoReplySettings.requireApprovalAbove === 'never') return true;

    const importanceLevel = { low: 0, medium: 1, high: 2 };
    const thresholdLevel = {
      low: 0,
      medium: 1,
      high: 2,
      never: 3,
    };

    return importanceLevel[importance] < thresholdLevel[config.autoReplySettings.requireApprovalAbove];
  }

  /**
   * Generate reply using AI
   */
  private async generateReply(
    email: { from: string; subject: string; body: string },
    config: GhostWriterConfig,
    matchingRule: AutomationRule | null
  ): Promise<{ subject: string; body: string; generatedAt: Date; confidence?: number }> {
    const customInstructions = matchingRule?.action.customInstructions || '';

    const prompt = `作为用户的 AI 助手，为以下邮件生成回复：

发件人: ${email.from}
主题: ${email.subject}
内容: ${email.body}

用户风格偏好: ${config.personality.baseStyle}
${config.personality.customInstructions ? `额外指示: ${config.personality.customInstructions}` : ''}
${customInstructions ? `特殊指示: ${customInstructions}` : ''}

签名选项: ${config.personality.signatureVariants.join(' / ')}

返回 JSON：
{
  "subject": "回复主题",
  "body": "回复正文",
  "confidence": 0.85,
  "reasoning": "回复策略说明"
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: config.personality.baseStyle as any,
        length: 'moderate',
      });

      const result = JSON.parse(response.replies[0].content);

      return {
        subject: result.subject || `Re: ${email.subject}`,
        body: result.body,
        generatedAt: new Date(),
        confidence: result.confidence,
      };
    } catch {
      return {
        subject: `Re: ${email.subject}`,
        body: '感谢您的邮件，我会尽快回复。',
        generatedAt: new Date(),
        confidence: 0.3,
      };
    }
  }

  /**
   * Review and approve/reject auto email
   */
  reviewAutoEmail(
    autoEmailId: string,
    action: 'approve' | 'reject' | 'modify',
    userId: string,
    modifications?: string,
    feedback?: AutoEmail['feedback']
  ): AutoEmail | null {
    const autoEmail = autoEmails.get(autoEmailId);
    if (!autoEmail) return null;

    autoEmail.reviewedAt = new Date();
    autoEmail.reviewedBy = userId;
    autoEmail.feedback = feedback;

    switch (action) {
      case 'approve':
        autoEmail.status = 'approved';
        break;
      case 'reject':
        autoEmail.status = 'rejected';
        break;
      case 'modify':
        autoEmail.status = 'modified_sent';
        autoEmail.modifications = modifications;
        break;
    }

    // Update rule stats
    if (autoEmail.triggeredRule) {
      const config = this.getConfig(userId);
      const rule = config.rules.find(r => r.id === autoEmail.triggeredRule);
      if (rule) {
        if (action === 'approve') rule.stats.approved++;
        if (action === 'reject') rule.stats.rejected++;
      }
    }

    return autoEmail;
  }

  /**
   * Get pending reviews for user
   */
  getPendingReviews(userId: string): AutoEmail[] {
    return Array.from(autoEmails.values())
      .filter(e => e.status === 'pending_review')
      .sort((a, b) =>
        new Date(b.originalEmail.receivedAt).getTime() -
        new Date(a.originalEmail.receivedAt).getTime()
      );
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(userId: string): Promise<DailyReport> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysEmails = Array.from(autoEmails.values())
      .filter(e => {
        const emailDate = new Date(e.originalEmail.receivedAt);
        emailDate.setHours(0, 0, 0, 0);
        return emailDate.getTime() === today.getTime();
      });

    const stats = {
      emailsReceived: todaysEmails.length,
      emailsProcessed: todaysEmails.filter(e => e.status !== 'pending_review').length,
      autoReplied: todaysEmails.filter(e => e.status === 'auto_sent').length,
      pendingReview: todaysEmails.filter(e => e.status === 'pending_review').length,
      manuallyHandled: todaysEmails.filter(e =>
        e.status === 'approved' || e.status === 'modified_sent'
      ).length,
    };

    // Category summary
    const categorySummary: Record<string, number> = {};
    todaysEmails.forEach(e => {
      const category = e.triggeredRule || 'uncategorized';
      categorySummary[category] = (categorySummary[category] || 0) + 1;
    });

    // Important emails
    const importantEmails = todaysEmails
      .filter(e => e.importance === 'high')
      .map(e => ({
        from: e.originalEmail.from,
        subject: e.originalEmail.subject,
        importance: e.importance,
        status: e.status,
      }));

    const report: DailyReport = {
      date: today,
      userId,
      stats,
      categorySummary,
      importantEmails,
      suggestedActions: [],
      learningInsights: [],
    };

    // Generate AI insights
    if (todaysEmails.length > 0) {
      const insights = await this.generateInsights(todaysEmails);
      report.suggestedActions = insights.suggestedActions;
      report.learningInsights = insights.learningInsights;
    }

    dailyStats.set(`${userId}_${today.toISOString().split('T')[0]}`, report);

    return report;
  }

  /**
   * Generate AI insights from processed emails
   */
  private async generateInsights(
    emails: AutoEmail[]
  ): Promise<{ suggestedActions: string[]; learningInsights: string[] }> {
    const summary = emails.map(e => ({
      from: e.originalEmail.from,
      subject: e.originalEmail.subject,
      status: e.status,
      feedback: e.feedback,
    }));

    const prompt = `分析今日邮件处理情况，提供建议和学习洞察：

${JSON.stringify(summary.slice(0, 20), null, 2)}

返回 JSON：
{
  "suggestedActions": ["建议1", "建议2"],
  "learningInsights": ["洞察1", "洞察2"]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });

      return JSON.parse(response.replies[0].content);
    } catch {
      return {
        suggestedActions: [],
        learningInsights: [],
      };
    }
  }

  /**
   * Add or update automation rule
   */
  addRule(userId: string, rule: Omit<AutomationRule, 'id' | 'stats'>): AutomationRule {
    const config = this.getConfig(userId);

    const newRule: AutomationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stats: { triggered: 0, approved: 0, rejected: 0 },
    };

    config.rules.push(newRule);
    return newRule;
  }

  /**
   * Get automation rule templates
   */
  getRuleTemplates(): Array<Omit<AutomationRule, 'id' | 'stats'>> {
    return [
      {
        name: '自动回复休假邮件',
        priority: 1,
        conditions: [],
        action: {
          type: 'reply',
          template: 'out_of_office',
          customInstructions: '告知发件人当前不在办公室',
        },
        enabled: false,
      },
      {
        name: '询价邮件转发销售',
        priority: 2,
        conditions: [
          { type: 'subject', operator: 'contains', value: 'quote' },
          { type: 'body', operator: 'contains', value: 'price' },
        ],
        action: {
          type: 'forward',
          forwardTo: 'sales@company.com',
          customInstructions: '转发给销售团队处理',
        },
        enabled: false,
      },
      {
        name: '投诉邮件优先处理',
        priority: 0,
        conditions: [
          { type: 'subject', operator: 'contains', value: 'complaint' },
        ],
        action: {
          type: 'escalate',
          label: 'urgent',
          customInstructions: '标记为紧急，立即通知',
        },
        enabled: false,
      },
    ];
  }
}

export const ghostWriterService = new GhostWriterService();
