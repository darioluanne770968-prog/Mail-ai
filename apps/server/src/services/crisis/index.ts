/**
 * Crisis Detection System Service
 * Early warning for PR crises, customer complaints, legal issues
 */

import { AIService } from '../ai/index.js';

export type CrisisType =
  | 'customer_complaint'
  | 'legal_threat'
  | 'pr_crisis'
  | 'security_breach'
  | 'employee_issue'
  | 'vendor_dispute'
  | 'regulatory'
  | 'financial';

export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CrisisAlert {
  id: string;
  type: CrisisType;
  severity: CrisisSeverity;
  title: string;
  description: string;
  sourceEmail: {
    id: string;
    from: string;
    subject: string;
    receivedAt: Date;
  };
  indicators: string[];
  suggestedActions: string[];
  escalationPath: Array<{
    level: number;
    contacts: string[];
    timeframe: string;
  }>;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'escalated';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  notes: string[];
  createdAt: Date;
}

export interface CrisisPattern {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  senderPatterns: string[];
  severity: CrisisSeverity;
  autoEscalate: boolean;
  notifyContacts: string[];
}

export interface CrisisDashboard {
  activeAlerts: CrisisAlert[];
  alertsByType: Record<CrisisType, number>;
  alertsBySeverity: Record<CrisisSeverity, number>;
  recentlyResolved: CrisisAlert[];
  trends: {
    lastWeek: number;
    thisWeek: number;
    change: number;
  };
  topRiskSenders: Array<{
    email: string;
    alertCount: number;
    lastAlert: Date;
  }>;
}

export interface EscalationRule {
  id: string;
  crisisType: CrisisType;
  severity: CrisisSeverity;
  timeToEscalate: number; // minutes
  escalateTo: string[];
  notificationMethod: 'email' | 'sms' | 'slack' | 'all';
}

// In-memory storage
const alerts = new Map<string, CrisisAlert>();
const patterns = new Map<string, CrisisPattern>();
const escalationRules = new Map<string, EscalationRule>();

export class CrisisDetectionService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default crisis patterns
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns: CrisisPattern[] = [
      {
        id: 'pattern_legal',
        name: '法律威胁',
        description: '检测法律诉讼、律师函等',
        keywords: ['lawsuit', 'legal action', 'attorney', 'lawyer', 'sue', 'court',
          '律师', '诉讼', '法院', '起诉', '法律', '赔偿'],
        senderPatterns: ['*@law.', '*@legal.', 'lawyer@'],
        severity: 'critical',
        autoEscalate: true,
        notifyContacts: [],
      },
      {
        id: 'pattern_complaint',
        name: '严重客户投诉',
        description: '检测升级的客户投诉',
        keywords: ['complaint', 'unacceptable', 'furious', 'terrible', 'worst',
          '投诉', '太差', '垃圾', '骗子', '退款', '消费者协会', '315'],
        senderPatterns: [],
        severity: 'high',
        autoEscalate: false,
        notifyContacts: [],
      },
      {
        id: 'pattern_security',
        name: '安全事件',
        description: '检测数据泄露、黑客攻击等',
        keywords: ['breach', 'hack', 'leaked', 'compromised', 'unauthorized access',
          '泄露', '入侵', '被盗', '漏洞', '攻击'],
        senderPatterns: [],
        severity: 'critical',
        autoEscalate: true,
        notifyContacts: [],
      },
      {
        id: 'pattern_regulatory',
        name: '监管问题',
        description: '检测监管机构的邮件',
        keywords: ['compliance', 'violation', 'regulatory', 'investigation', 'audit',
          '违规', '监管', '调查', '审计', '处罚'],
        senderPatterns: ['*@gov.', '*@sec.', '*@fda.'],
        severity: 'high',
        autoEscalate: true,
        notifyContacts: [],
      },
      {
        id: 'pattern_pr',
        name: 'PR危机',
        description: '检测媒体负面报道、社交媒体危机',
        keywords: ['media inquiry', 'journalist', 'press', 'viral', 'social media',
          '记者', '媒体', '曝光', '热搜', '舆论'],
        senderPatterns: ['*@news.', '*@media.', 'reporter@'],
        severity: 'high',
        autoEscalate: false,
        notifyContacts: [],
      },
    ];

    defaultPatterns.forEach(p => patterns.set(p.id, p));
  }

  /**
   * Scan email for crisis indicators
   */
  async scanEmail(email: {
    id: string;
    from: string;
    subject: string;
    body: string;
    receivedAt: Date;
  }): Promise<CrisisAlert | null> {
    // Quick pattern matching first
    const matchedPattern = this.matchPatterns(email);

    // AI-powered deep analysis
    const prompt = `分析以下邮件是否包含危机/风险信号：

发件人: ${email.from}
主题: ${email.subject}
内容:
${email.body.slice(0, 2000)}

检查以下类型的危机：
1. 客户投诉升级
2. 法律威胁
3. PR危机（媒体、社交媒体）
4. 安全事件
5. 员工问题
6. 供应商纠纷
7. 监管问题
8. 财务问题

返回 JSON：
{
  "hasCrisis": true/false,
  "type": "crisis_type",
  "severity": "low|medium|high|critical",
  "title": "危机标题",
  "description": "危机描述",
  "indicators": ["指标1", "指标2"],
  "suggestedActions": ["建议行动1", "建议行动2"],
  "urgency": "立即处理/24小时内/可以等待"
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const result = JSON.parse(response.replies[0].content);

      if (!result.hasCrisis && !matchedPattern) {
        return null;
      }

      // Use AI result or pattern match
      const severity = result.severity || matchedPattern?.severity || 'medium';
      const crisisType = result.type || 'customer_complaint';

      const alert: CrisisAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: crisisType as CrisisType,
        severity: severity as CrisisSeverity,
        title: result.title || `来自 ${email.from} 的潜在问题`,
        description: result.description || '检测到潜在危机信号',
        sourceEmail: {
          id: email.id,
          from: email.from,
          subject: email.subject,
          receivedAt: email.receivedAt,
        },
        indicators: result.indicators || [],
        suggestedActions: result.suggestedActions || [],
        escalationPath: this.generateEscalationPath(crisisType as CrisisType, severity as CrisisSeverity),
        status: 'new',
        notes: [],
        createdAt: new Date(),
      };

      alerts.set(alert.id, alert);

      // Auto-escalate if needed
      if (matchedPattern?.autoEscalate || severity === 'critical') {
        await this.autoEscalate(alert);
      }

      return alert;
    } catch {
      // If AI fails, still check pattern match
      if (matchedPattern) {
        const alert: CrisisAlert = {
          id: `alert_${Date.now()}`,
          type: 'customer_complaint',
          severity: matchedPattern.severity,
          title: `模式匹配: ${matchedPattern.name}`,
          description: matchedPattern.description,
          sourceEmail: {
            id: email.id,
            from: email.from,
            subject: email.subject,
            receivedAt: email.receivedAt,
          },
          indicators: matchedPattern.keywords.filter(k =>
            email.body.toLowerCase().includes(k.toLowerCase()) ||
            email.subject.toLowerCase().includes(k.toLowerCase())
          ),
          suggestedActions: ['人工审核邮件内容', '评估是否需要升级处理'],
          escalationPath: [],
          status: 'new',
          notes: [],
          createdAt: new Date(),
        };
        alerts.set(alert.id, alert);
        return alert;
      }

      return null;
    }
  }

  /**
   * Match email against patterns
   */
  private matchPatterns(email: { from: string; subject: string; body: string }): CrisisPattern | null {
    const content = `${email.subject} ${email.body}`.toLowerCase();
    const sender = email.from.toLowerCase();

    for (const pattern of patterns.values()) {
      // Check keywords
      const keywordMatch = pattern.keywords.some(k => content.includes(k.toLowerCase()));

      // Check sender patterns
      const senderMatch = pattern.senderPatterns.some(p => {
        const regex = new RegExp(p.replace('*', '.*'), 'i');
        return regex.test(sender);
      });

      if (keywordMatch || senderMatch) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Generate escalation path
   */
  private generateEscalationPath(
    type: CrisisType,
    severity: CrisisSeverity
  ): CrisisAlert['escalationPath'] {
    const basePath: CrisisAlert['escalationPath'] = [];

    if (severity === 'critical') {
      basePath.push(
        { level: 1, contacts: ['direct_manager'], timeframe: '立即' },
        { level: 2, contacts: ['department_head'], timeframe: '15分钟内' },
        { level: 3, contacts: ['c_level'], timeframe: '1小时内' }
      );
    } else if (severity === 'high') {
      basePath.push(
        { level: 1, contacts: ['direct_manager'], timeframe: '1小时内' },
        { level: 2, contacts: ['department_head'], timeframe: '4小时内' }
      );
    } else {
      basePath.push(
        { level: 1, contacts: ['team_lead'], timeframe: '24小时内' }
      );
    }

    // Add type-specific escalation
    if (type === 'legal_threat') {
      basePath.push({ level: 0, contacts: ['legal_team'], timeframe: '立即' });
    } else if (type === 'pr_crisis') {
      basePath.push({ level: 0, contacts: ['pr_team'], timeframe: '立即' });
    } else if (type === 'security_breach') {
      basePath.push({ level: 0, contacts: ['security_team'], timeframe: '立即' });
    }

    return basePath.sort((a, b) => a.level - b.level);
  }

  /**
   * Auto-escalate critical alerts
   */
  private async autoEscalate(alert: CrisisAlert): Promise<void> {
    alert.status = 'escalated';
    alert.notes.push(`[${new Date().toISOString()}] 系统自动升级处理`);

    // In production, would send notifications
    console.log(`Crisis auto-escalated: ${alert.id} - ${alert.title}`);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string, note?: string): CrisisAlert | null {
    const alert = alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    if (note) {
      alert.notes.push(`[${new Date().toISOString()}] ${userId}: ${note}`);
    }

    return alert;
  }

  /**
   * Update alert status
   */
  updateAlertStatus(
    alertId: string,
    status: CrisisAlert['status'],
    note?: string
  ): CrisisAlert | null {
    const alert = alerts.get(alertId);
    if (!alert) return null;

    alert.status = status;
    if (status === 'resolved') {
      alert.resolvedAt = new Date();
    }

    if (note) {
      alert.notes.push(`[${new Date().toISOString()}] ${note}`);
    }

    return alert;
  }

  /**
   * Get crisis dashboard
   */
  getDashboard(): CrisisDashboard {
    const allAlerts = Array.from(alerts.values());
    const activeAlerts = allAlerts.filter(a =>
      !['resolved'].includes(a.status)
    );

    // Count by type
    const alertsByType: Record<string, number> = {} as any;
    const alertsBySeverity: Record<string, number> = {} as any;

    activeAlerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    // Recently resolved
    const recentlyResolved = allAlerts
      .filter(a => a.status === 'resolved' && a.resolvedAt)
      .sort((a, b) => b.resolvedAt!.getTime() - a.resolvedAt!.getTime())
      .slice(0, 5);

    // Trends
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = allAlerts.filter(a => a.createdAt >= oneWeekAgo).length;
    const lastWeek = allAlerts.filter(a => a.createdAt >= twoWeeksAgo && a.createdAt < oneWeekAgo).length;

    // Top risk senders
    const senderCounts = new Map<string, { count: number; lastAlert: Date }>();
    allAlerts.forEach(alert => {
      const sender = alert.sourceEmail.from;
      const current = senderCounts.get(sender) || { count: 0, lastAlert: new Date(0) };
      senderCounts.set(sender, {
        count: current.count + 1,
        lastAlert: alert.createdAt > current.lastAlert ? alert.createdAt : current.lastAlert,
      });
    });

    const topRiskSenders = Array.from(senderCounts.entries())
      .map(([email, data]) => ({ email, alertCount: data.count, lastAlert: data.lastAlert }))
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 5);

    return {
      activeAlerts: activeAlerts.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      alertsByType: alertsByType as Record<CrisisType, number>,
      alertsBySeverity: alertsBySeverity as Record<CrisisSeverity, number>,
      recentlyResolved,
      trends: {
        lastWeek,
        thisWeek,
        change: lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0,
      },
      topRiskSenders,
    };
  }

  /**
   * Add custom crisis pattern
   */
  addPattern(pattern: Omit<CrisisPattern, 'id'>): CrisisPattern {
    const newPattern: CrisisPattern = {
      ...pattern,
      id: `pattern_${Date.now()}`,
    };
    patterns.set(newPattern.id, newPattern);
    return newPattern;
  }

  /**
   * Get all patterns
   */
  getPatterns(): CrisisPattern[] {
    return Array.from(patterns.values());
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): CrisisAlert | null {
    return alerts.get(alertId) || null;
  }
}

export const crisisDetectionService = new CrisisDetectionService();
