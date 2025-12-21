/**
 * Email Time Machine Service
 * Version control and undo for emails
 */

import { AIService } from '../ai/index.js';

export interface EmailVersion {
  id: string;
  emailId: string;
  version: number;
  content: {
    subject: string;
    body: string;
    recipients: string[];
    cc?: string[];
    bcc?: string[];
    attachments?: string[];
  };
  createdAt: Date;
  author: string;
  changeType: 'created' | 'edited' | 'scheduled' | 'sent' | 'recalled';
  changeSummary: string;
  diff?: {
    subjectChanged: boolean;
    bodyChanges: Array<{
      type: 'added' | 'removed' | 'modified';
      position: number;
      oldText?: string;
      newText?: string;
    }>;
    recipientChanges: string[];
  };
}

export interface ScheduledEmail {
  id: string;
  userId: string;
  content: EmailVersion['content'];
  scheduledFor: Date;
  createdAt: Date;
  status: 'scheduled' | 'sent' | 'cancelled' | 'recalled';
  recallWindowMinutes: number;
  versions: EmailVersion[];
}

export interface RecallResult {
  success: boolean;
  emailId: string;
  recalledAt: Date;
  reason: string;
  recipientStatus: Array<{
    email: string;
    recalled: boolean;
    readBeforeRecall: boolean;
    message: string;
  }>;
}

export interface WhatIfAnalysis {
  originalEmail: EmailVersion['content'];
  alternativeEmail: EmailVersion['content'];
  analysis: {
    toneComparison: {
      original: string;
      alternative: string;
      improvement: number; // -1 to 1
    };
    clarityComparison: {
      original: number; // 0-1
      alternative: number;
    };
    potentialOutcomes: Array<{
      scenario: string;
      probability: number;
      impact: 'positive' | 'negative' | 'neutral';
    }>;
    recommendation: string;
  };
}

export interface EmailRegret {
  emailId: string;
  regretScore: number; // 0-1
  reasons: string[];
  suggestedFollowUp?: string;
  preventionTips: string[];
}

// In-memory storage
const emailVersions = new Map<string, EmailVersion[]>();
const scheduledEmails = new Map<string, ScheduledEmail>();
const sentEmails = new Map<string, {
  content: EmailVersion['content'];
  sentAt: Date;
  canRecall: boolean;
  recallDeadline: Date;
}>();

export class TimeMachineService {
  private aiService: AIService;
  private defaultRecallWindowMinutes = 30;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Create a new email draft with version tracking
   */
  createDraft(
    userId: string,
    content: EmailVersion['content']
  ): { emailId: string; version: EmailVersion } {
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const version: EmailVersion = {
      id: `ver_${Date.now()}`,
      emailId,
      version: 1,
      content,
      createdAt: new Date(),
      author: userId,
      changeType: 'created',
      changeSummary: '创建邮件草稿',
    };

    emailVersions.set(emailId, [version]);

    return { emailId, version };
  }

  /**
   * Save a new version of an email
   */
  saveVersion(
    emailId: string,
    userId: string,
    content: EmailVersion['content'],
    changeSummary?: string
  ): EmailVersion {
    const versions = emailVersions.get(emailId) || [];
    const previousVersion = versions[versions.length - 1];

    // Calculate diff
    const diff = this.calculateDiff(previousVersion?.content, content);

    const newVersion: EmailVersion = {
      id: `ver_${Date.now()}`,
      emailId,
      version: versions.length + 1,
      content,
      createdAt: new Date(),
      author: userId,
      changeType: 'edited',
      changeSummary: changeSummary || this.generateChangeSummary(diff),
      diff,
    };

    versions.push(newVersion);
    emailVersions.set(emailId, versions);

    return newVersion;
  }

  /**
   * Calculate diff between two versions
   */
  private calculateDiff(
    oldContent?: EmailVersion['content'],
    newContent?: EmailVersion['content']
  ): EmailVersion['diff'] {
    if (!oldContent || !newContent) {
      return {
        subjectChanged: true,
        bodyChanges: [{ type: 'added', position: 0, newText: newContent?.body }],
        recipientChanges: newContent?.recipients || [],
      };
    }

    const subjectChanged = oldContent.subject !== newContent.subject;

    // Simple word-level diff for body
    const oldWords = oldContent.body.split(/\s+/);
    const newWords = newContent.body.split(/\s+/);
    const bodyChanges: EmailVersion['diff']['bodyChanges'] = [];

    let i = 0, j = 0;
    while (i < oldWords.length || j < newWords.length) {
      if (i >= oldWords.length) {
        bodyChanges.push({ type: 'added', position: j, newText: newWords.slice(j).join(' ') });
        break;
      }
      if (j >= newWords.length) {
        bodyChanges.push({ type: 'removed', position: i, oldText: oldWords.slice(i).join(' ') });
        break;
      }
      if (oldWords[i] !== newWords[j]) {
        bodyChanges.push({
          type: 'modified',
          position: i,
          oldText: oldWords[i],
          newText: newWords[j],
        });
      }
      i++;
      j++;
    }

    // Recipient changes
    const oldRecipients = new Set(oldContent.recipients);
    const newRecipients = new Set(newContent.recipients);
    const recipientChanges: string[] = [];

    newRecipients.forEach(r => {
      if (!oldRecipients.has(r)) recipientChanges.push(`+${r}`);
    });
    oldRecipients.forEach(r => {
      if (!newRecipients.has(r)) recipientChanges.push(`-${r}`);
    });

    return { subjectChanged, bodyChanges, recipientChanges };
  }

  /**
   * Generate change summary from diff
   */
  private generateChangeSummary(diff?: EmailVersion['diff']): string {
    if (!diff) return '更新邮件';

    const parts: string[] = [];
    if (diff.subjectChanged) parts.push('修改主题');
    if (diff.bodyChanges.length > 0) parts.push(`修改正文 (${diff.bodyChanges.length} 处)`);
    if (diff.recipientChanges.length > 0) parts.push(`更新收件人 (${diff.recipientChanges.length} 处)`);

    return parts.join(', ') || '更新邮件';
  }

  /**
   * Get version history for an email
   */
  getVersionHistory(emailId: string): EmailVersion[] {
    return emailVersions.get(emailId) || [];
  }

  /**
   * Restore a previous version
   */
  restoreVersion(
    emailId: string,
    versionId: string,
    userId: string
  ): EmailVersion | null {
    const versions = emailVersions.get(emailId);
    if (!versions) return null;

    const targetVersion = versions.find(v => v.id === versionId);
    if (!targetVersion) return null;

    return this.saveVersion(
      emailId,
      userId,
      targetVersion.content,
      `恢复到版本 ${targetVersion.version}`
    );
  }

  /**
   * Schedule an email for delayed sending
   */
  scheduleEmail(
    userId: string,
    content: EmailVersion['content'],
    scheduledFor: Date,
    recallWindowMinutes?: number
  ): ScheduledEmail {
    const { emailId, version } = this.createDraft(userId, content);

    const scheduled: ScheduledEmail = {
      id: emailId,
      userId,
      content,
      scheduledFor,
      createdAt: new Date(),
      status: 'scheduled',
      recallWindowMinutes: recallWindowMinutes || this.defaultRecallWindowMinutes,
      versions: [version],
    };

    scheduledEmails.set(emailId, scheduled);

    return scheduled;
  }

  /**
   * Cancel a scheduled email
   */
  cancelScheduled(emailId: string): boolean {
    const scheduled = scheduledEmails.get(emailId);
    if (!scheduled || scheduled.status !== 'scheduled') return false;

    scheduled.status = 'cancelled';
    return true;
  }

  /**
   * Simulate sending an email (with recall window)
   */
  sendEmail(emailId: string): {
    sent: boolean;
    canRecall: boolean;
    recallDeadline: Date;
  } {
    const versions = emailVersions.get(emailId);
    if (!versions || versions.length === 0) {
      return { sent: false, canRecall: false, recallDeadline: new Date() };
    }

    const latestVersion = versions[versions.length - 1];
    const recallDeadline = new Date(Date.now() + this.defaultRecallWindowMinutes * 60 * 1000);

    sentEmails.set(emailId, {
      content: latestVersion.content,
      sentAt: new Date(),
      canRecall: true,
      recallDeadline,
    });

    // Add sent version
    const sentVersion: EmailVersion = {
      ...latestVersion,
      id: `ver_${Date.now()}`,
      version: versions.length + 1,
      createdAt: new Date(),
      changeType: 'sent',
      changeSummary: '邮件已发送',
    };
    versions.push(sentVersion);

    return { sent: true, canRecall: true, recallDeadline };
  }

  /**
   * Attempt to recall a sent email
   */
  recallEmail(emailId: string, reason: string): RecallResult {
    const sentEmail = sentEmails.get(emailId);

    if (!sentEmail) {
      return {
        success: false,
        emailId,
        recalledAt: new Date(),
        reason: '邮件未找到',
        recipientStatus: [],
      };
    }

    if (!sentEmail.canRecall || new Date() > sentEmail.recallDeadline) {
      return {
        success: false,
        emailId,
        recalledAt: new Date(),
        reason: '已超过撤回时间窗口',
        recipientStatus: sentEmail.content.recipients.map(email => ({
          email,
          recalled: false,
          readBeforeRecall: true,
          message: '无法撤回',
        })),
      };
    }

    // Simulate recall (in reality would depend on email provider)
    const recipientStatus = sentEmail.content.recipients.map(email => {
      const wasRead = Math.random() < 0.3; // 30% chance already read
      return {
        email,
        recalled: !wasRead,
        readBeforeRecall: wasRead,
        message: wasRead ? '收件人可能已阅读' : '已成功撤回',
      };
    });

    sentEmail.canRecall = false;

    // Add recalled version
    const versions = emailVersions.get(emailId) || [];
    const recalledVersion: EmailVersion = {
      id: `ver_${Date.now()}`,
      emailId,
      version: versions.length + 1,
      content: sentEmail.content,
      createdAt: new Date(),
      author: 'system',
      changeType: 'recalled',
      changeSummary: `撤回邮件: ${reason}`,
    };
    versions.push(recalledVersion);

    return {
      success: recipientStatus.some(r => r.recalled),
      emailId,
      recalledAt: new Date(),
      reason,
      recipientStatus,
    };
  }

  /**
   * "What if" analysis - compare alternative versions
   */
  async whatIfAnalysis(
    originalContent: EmailVersion['content'],
    alternativeContent: EmailVersion['content']
  ): Promise<WhatIfAnalysis> {
    const prompt = `比较以下两个版本的邮件，分析如果发送不同版本会有什么结果：

原始版本：
主题: ${originalContent.subject}
内容: ${originalContent.body}

替代版本：
主题: ${alternativeContent.subject}
内容: ${alternativeContent.body}

请分析：
1. 语气对比
2. 清晰度对比
3. 可能的结果预测
4. 推荐发送哪个版本

返回 JSON：
{
  "toneComparison": {
    "original": "语气描述",
    "alternative": "语气描述",
    "improvement": 0.3
  },
  "clarityComparison": {
    "original": 0.7,
    "alternative": 0.9
  },
  "potentialOutcomes": [
    {
      "scenario": "场景描述",
      "probability": 0.6,
      "impact": "positive"
    }
  ],
  "recommendation": "推荐建议"
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const analysis = JSON.parse(response.replies[0].content);

      return {
        originalEmail: originalContent,
        alternativeEmail: alternativeContent,
        analysis,
      };
    } catch {
      return {
        originalEmail: originalContent,
        alternativeEmail: alternativeContent,
        analysis: {
          toneComparison: {
            original: 'unknown',
            alternative: 'unknown',
            improvement: 0,
          },
          clarityComparison: {
            original: 0.5,
            alternative: 0.5,
          },
          potentialOutcomes: [],
          recommendation: '无法完成分析',
        },
      };
    }
  }

  /**
   * Analyze if user might regret sending an email
   */
  async analyzeRegretRisk(content: EmailVersion['content']): Promise<EmailRegret> {
    const prompt = `分析这封邮件发送后可能产生的后悔风险：

主题: ${content.subject}
收件人: ${content.recipients.join(', ')}
内容: ${content.body}

检查以下风险因素：
1. 情绪化语言（愤怒、沮丧）
2. 可能被误解的措辞
3. 敏感信息泄露
4. 不当的收件人
5. 过于仓促的决定
6. 职业声誉风险

返回 JSON：
{
  "regretScore": 0.7,
  "reasons": ["原因1", "原因2"],
  "suggestedFollowUp": "建议的跟进邮件内容",
  "preventionTips": ["预防建议1", "预防建议2"]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const analysis = JSON.parse(response.replies[0].content);

      return {
        emailId: `analysis_${Date.now()}`,
        ...analysis,
      };
    } catch {
      return {
        emailId: `analysis_${Date.now()}`,
        regretScore: 0.3,
        reasons: [],
        preventionTips: ['建议发送前再次检查'],
      };
    }
  }

  /**
   * Get scheduled emails for a user
   */
  getScheduledEmails(userId: string): ScheduledEmail[] {
    return Array.from(scheduledEmails.values())
      .filter(e => e.userId === userId && e.status === 'scheduled')
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Compare two versions side by side
   */
  compareVersions(
    emailId: string,
    version1: number,
    version2: number
  ): {
    version1: EmailVersion | null;
    version2: EmailVersion | null;
    diff: EmailVersion['diff'] | null;
  } {
    const versions = emailVersions.get(emailId);
    if (!versions) return { version1: null, version2: null, diff: null };

    const v1 = versions.find(v => v.version === version1) || null;
    const v2 = versions.find(v => v.version === version2) || null;

    const diff = v1 && v2 ? this.calculateDiff(v1.content, v2.content) : null;

    return { version1: v1, version2: v2, diff };
  }
}

export const timeMachineService = new TimeMachineService();
