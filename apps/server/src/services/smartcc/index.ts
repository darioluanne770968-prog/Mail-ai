/**
 * Smart CC Suggestions Service
 * AI-powered CC/BCC recommendations
 */

import { AIService } from '../ai/index.js';

export interface ContactInfo {
  email: string;
  name: string;
  department?: string;
  title?: string;
  relationship: 'manager' | 'peer' | 'direct_report' | 'external' | 'unknown';
  communicationFrequency: number; // emails per month
}

export interface CCSuggestion {
  contact: ContactInfo;
  reason: string;
  confidence: number;
  type: 'should_cc' | 'consider_cc' | 'fyi_only' | 'remove_cc';
  priority: 'high' | 'medium' | 'low';
}

export interface CCAnalysis {
  suggestions: CCSuggestion[];
  warnings: Array<{
    type: 'missing_stakeholder' | 'unnecessary_cc' | 'sensitive_content' | 'reply_all_warning';
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  organizationalContext: {
    involvedTeams: string[];
    escalationLevel: number;
    sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  };
}

export interface OrgStructure {
  userId: string;
  managers: ContactInfo[];
  directReports: ContactInfo[];
  peers: ContactInfo[];
  frequentContacts: ContactInfo[];
  teams: Array<{
    name: string;
    members: ContactInfo[];
  }>;
}

// In-memory storage for org structure
const orgStructures = new Map<string, OrgStructure>();
const communicationHistory = new Map<string, Map<string, number>>(); // userId -> email -> count

export class SmartCCService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Analyze email and suggest CC recipients
   */
  async analyzeCCNeeds(
    userId: string,
    emailContent: {
      subject: string;
      body: string;
      to: string[];
      currentCC: string[];
      isReply: boolean;
      originalSender?: string;
    }
  ): Promise<CCAnalysis> {
    const orgStructure = this.getOrgStructure(userId);
    const allContacts = this.getAllContacts(orgStructure);

    const prompt = `分析以下邮件，建议应该抄送哪些人：

主题：${emailContent.subject}
收件人：${emailContent.to.join(', ')}
当前抄送：${emailContent.currentCC.join(', ') || '无'}
是否为回复：${emailContent.isReply ? '是' : '否'}
${emailContent.originalSender ? `原始发件人：${emailContent.originalSender}` : ''}

邮件内容：
${emailContent.body.slice(0, 1500)}

已知联系人：
${allContacts.slice(0, 20).map(c => `- ${c.name} (${c.email}) - ${c.relationship} - ${c.department || '未知部门'}`).join('\n')}

请分析：
1. 哪些人应该被抄送（基于内容相关性、组织层级、项目关联）
2. 当前抄送中是否有不必要的人
3. 是否遗漏了重要干系人
4. 内容敏感度评估

返回 JSON：
{
  "suggestions": [
    {
      "email": "email@example.com",
      "name": "姓名",
      "reason": "抄送原因",
      "confidence": 0.85,
      "type": "should_cc|consider_cc|fyi_only|remove_cc",
      "priority": "high|medium|low"
    }
  ],
  "warnings": [
    {
      "type": "missing_stakeholder|unnecessary_cc|sensitive_content|reply_all_warning",
      "message": "警告信息",
      "severity": "info|warning|critical"
    }
  ],
  "organizationalContext": {
    "involvedTeams": ["团队1", "团队2"],
    "escalationLevel": 1,
    "sensitivityLevel": "internal"
  }
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const result = JSON.parse(response.replies[0].content);

      // Map suggestions to contacts
      const suggestions: CCSuggestion[] = result.suggestions.map((s: any) => ({
        contact: allContacts.find(c => c.email === s.email) || {
          email: s.email,
          name: s.name,
          relationship: 'unknown' as const,
          communicationFrequency: 0,
        },
        reason: s.reason,
        confidence: s.confidence,
        type: s.type,
        priority: s.priority,
      }));

      return {
        suggestions,
        warnings: result.warnings || [],
        organizationalContext: result.organizationalContext || {
          involvedTeams: [],
          escalationLevel: 0,
          sensitivityLevel: 'internal',
        },
      };
    } catch {
      return {
        suggestions: [],
        warnings: [],
        organizationalContext: {
          involvedTeams: [],
          escalationLevel: 0,
          sensitivityLevel: 'internal',
        },
      };
    }
  }

  /**
   * Check for Reply-All appropriateness
   */
  async checkReplyAll(
    emailContent: string,
    allRecipients: string[],
    userId: string
  ): Promise<{
    shouldReplyAll: boolean;
    reason: string;
    suggestedRecipients: string[];
  }> {
    if (allRecipients.length <= 2) {
      return {
        shouldReplyAll: true,
        reason: '收件人较少，回复全部是合适的',
        suggestedRecipients: allRecipients,
      };
    }

    const prompt = `分析这封回复邮件是否应该使用"回复全部"：

收件人数量：${allRecipients.length}
邮件内容：${emailContent.slice(0, 500)}

返回 JSON：
{
  "shouldReplyAll": true/false,
  "reason": "原因",
  "suggestedRecipients": ["必要的收件人邮箱"]
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
        shouldReplyAll: allRecipients.length <= 5,
        reason: '无法分析，建议根据内容相关性判断',
        suggestedRecipients: allRecipients,
      };
    }
  }

  /**
   * Detect missing stakeholders
   */
  async detectMissingStakeholders(
    userId: string,
    emailContent: string,
    currentRecipients: string[]
  ): Promise<Array<{
    contact: ContactInfo;
    reason: string;
    importance: 'critical' | 'important' | 'optional';
  }>> {
    const orgStructure = this.getOrgStructure(userId);

    // Check if manager should be included for important decisions
    const missingStakeholders: Array<{
      contact: ContactInfo;
      reason: string;
      importance: 'critical' | 'important' | 'optional';
    }> = [];

    // Check for escalation keywords
    const escalationKeywords = ['urgent', 'critical', 'deadline', 'approval', 'decision',
      '紧急', '重要', '截止', '批准', '决定', '预算', 'budget'];
    const hasEscalation = escalationKeywords.some(k =>
      emailContent.toLowerCase().includes(k.toLowerCase())
    );

    if (hasEscalation && orgStructure.managers.length > 0) {
      const manager = orgStructure.managers[0];
      if (!currentRecipients.includes(manager.email)) {
        missingStakeholders.push({
          contact: manager,
          reason: '邮件涉及重要决策/紧急事项，建议抄送直属领导',
          importance: 'important',
        });
      }
    }

    // Check for project-related stakeholders
    const projectKeywords = ['project', 'milestone', 'deliverable', '项目', '里程碑', '交付'];
    const isProjectRelated = projectKeywords.some(k =>
      emailContent.toLowerCase().includes(k.toLowerCase())
    );

    if (isProjectRelated) {
      // Would check project membership in production
    }

    return missingStakeholders;
  }

  /**
   * Get organizational structure for user
   */
  getOrgStructure(userId: string): OrgStructure {
    let structure = orgStructures.get(userId);

    if (!structure) {
      // Create default structure
      structure = {
        userId,
        managers: [],
        directReports: [],
        peers: [],
        frequentContacts: [],
        teams: [],
      };
      orgStructures.set(userId, structure);
    }

    return structure;
  }

  /**
   * Update organizational structure
   */
  updateOrgStructure(userId: string, updates: Partial<OrgStructure>): OrgStructure {
    const current = this.getOrgStructure(userId);
    const updated = { ...current, ...updates };
    orgStructures.set(userId, updated);
    return updated;
  }

  /**
   * Record communication for frequency analysis
   */
  recordCommunication(userId: string, contactEmail: string): void {
    let userHistory = communicationHistory.get(userId);
    if (!userHistory) {
      userHistory = new Map();
      communicationHistory.set(userId, userHistory);
    }

    const currentCount = userHistory.get(contactEmail) || 0;
    userHistory.set(contactEmail, currentCount + 1);
  }

  /**
   * Get all contacts from org structure
   */
  private getAllContacts(orgStructure: OrgStructure): ContactInfo[] {
    const contacts: ContactInfo[] = [
      ...orgStructure.managers,
      ...orgStructure.directReports,
      ...orgStructure.peers,
      ...orgStructure.frequentContacts,
    ];

    orgStructure.teams.forEach(team => {
      contacts.push(...team.members);
    });

    // Deduplicate by email
    const seen = new Set<string>();
    return contacts.filter(c => {
      if (seen.has(c.email)) return false;
      seen.add(c.email);
      return true;
    });
  }

  /**
   * Suggest optimal recipient order
   */
  optimizeRecipientOrder(
    to: string[],
    cc: string[],
    orgStructure: OrgStructure
  ): { to: string[]; cc: string[] } {
    const allContacts = this.getAllContacts(orgStructure);
    const contactMap = new Map(allContacts.map(c => [c.email, c]));

    // Sort by relationship importance
    const priority: Record<string, number> = {
      manager: 1,
      direct_report: 2,
      peer: 3,
      external: 4,
      unknown: 5,
    };

    const sortByPriority = (emails: string[]) =>
      emails.sort((a, b) => {
        const contactA = contactMap.get(a);
        const contactB = contactMap.get(b);
        const priorityA = priority[contactA?.relationship || 'unknown'];
        const priorityB = priority[contactB?.relationship || 'unknown'];
        return priorityA - priorityB;
      });

    return {
      to: sortByPriority([...to]),
      cc: sortByPriority([...cc]),
    };
  }
}

export const smartCCService = new SmartCCService();
