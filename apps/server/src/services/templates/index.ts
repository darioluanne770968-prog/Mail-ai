/**
 * Smart Template Engine Service
 * Context-aware templates that adapt to recipients and situations
 */

import { AIService } from '../ai/index.js';

export interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'recipient';
  label: string;
  defaultValue?: string;
  options?: string[]; // For select type
  required: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  body: string;
  variables: TemplateVariable[];
  tags: string[];
  language: 'zh' | 'en' | 'auto';
  tone: 'formal' | 'casual' | 'neutral';
  useCount: number;
  successRate: number; // Based on response rates
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
}

export interface TemplateContext {
  recipient: {
    email: string;
    name?: string;
    company?: string;
    title?: string;
    relationship?: 'customer' | 'colleague' | 'vendor' | 'prospect' | 'unknown';
    previousInteractions?: number;
    preferredLanguage?: string;
  };
  sender: {
    name: string;
    title?: string;
    company?: string;
  };
  purpose: string;
  urgency?: 'low' | 'normal' | 'high';
  customVariables?: Record<string, string>;
}

export interface AdaptedTemplate {
  subject: string;
  body: string;
  suggestions: string[];
  confidenceScore: number;
  alternatives: Array<{
    subject: string;
    body: string;
    reason: string;
  }>;
}

export interface TemplateAnalytics {
  templateId: string;
  totalUses: number;
  responseRate: number;
  avgResponseTime: number; // hours
  positiveResponses: number;
  negativeResponses: number;
  noResponse: number;
  byRecipientType: Record<string, {
    uses: number;
    responseRate: number;
  }>;
}

export interface TemplateRecommendation {
  template: EmailTemplate;
  matchScore: number;
  reason: string;
  adaptations: string[];
}

// In-memory storage
const templates = new Map<string, EmailTemplate>();
const analytics = new Map<string, TemplateAnalytics>();

export class SmartTemplateService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: '初次联系 - 商务合作',
        category: 'business',
        description: '首次联系潜在合作伙伴或客户',
        subject: '关于{{topic}}的合作意向',
        body: `{{recipientTitle}}{{recipientName}}，您好！

我是{{senderCompany}}的{{senderName}}，{{senderTitle}}。

{{introContext}}

我们注意到贵公司在{{recipientField}}领域的出色表现，希望能与您探讨{{topic}}方面的合作可能性。

{{valueProposition}}

如果您有兴趣，我们可以安排一个简短的电话会议或视频会议，详细沟通。

期待您的回复！

{{senderSignature}}`,
        variables: [
          { name: 'topic', type: 'text', label: '合作主题', required: true },
          { name: 'introContext', type: 'text', label: '自我介绍背景', required: false },
          { name: 'recipientField', type: 'text', label: '对方公司领域', required: false },
          { name: 'valueProposition', type: 'text', label: '价值主张', required: true },
        ],
        tags: ['商务', '首次联系', '合作'],
        language: 'zh',
        tone: 'formal',
        useCount: 0,
        successRate: 0,
        createdBy: 'system',
        isPublic: true,
      },
      {
        name: '会议邀请',
        category: 'meeting',
        description: '邀请参加会议',
        subject: '会议邀请：{{meetingTopic}} - {{meetingDate}}',
        body: `{{recipientName}}，您好！

诚邀您参加{{meetingTopic}}会议。

会议详情：
- 时间：{{meetingDate}} {{meetingTime}}
- 地点：{{meetingLocation}}
- 时长：约{{duration}}
- 议程：{{agenda}}

{{additionalInfo}}

请确认您是否能够参加。如有任何问题，请随时联系我。

谢谢！

{{senderName}}`,
        variables: [
          { name: 'meetingTopic', type: 'text', label: '会议主题', required: true },
          { name: 'meetingDate', type: 'date', label: '会议日期', required: true },
          { name: 'meetingTime', type: 'text', label: '会议时间', required: true },
          { name: 'meetingLocation', type: 'text', label: '会议地点', required: true },
          { name: 'duration', type: 'text', label: '预计时长', required: false, defaultValue: '1小时' },
          { name: 'agenda', type: 'text', label: '会议议程', required: false },
          { name: 'additionalInfo', type: 'text', label: '补充信息', required: false },
        ],
        tags: ['会议', '邀请', '日程'],
        language: 'zh',
        tone: 'formal',
        useCount: 0,
        successRate: 0,
        createdBy: 'system',
        isPublic: true,
      },
      {
        name: '跟进邮件',
        category: 'followup',
        description: '对之前沟通的跟进',
        subject: 'Re: {{previousSubject}} - 跟进',
        body: `{{recipientName}}，您好！

希望您一切顺利！

我想跟进一下我们之前关于{{topic}}的讨论。{{lastInteraction}}

{{currentStatus}}

{{nextSteps}}

如果您有任何问题或需要更多信息，请随时告诉我。

期待您的回复！

{{senderName}}`,
        variables: [
          { name: 'previousSubject', type: 'text', label: '之前邮件主题', required: true },
          { name: 'topic', type: 'text', label: '讨论主题', required: true },
          { name: 'lastInteraction', type: 'text', label: '上次互动情况', required: false },
          { name: 'currentStatus', type: 'text', label: '当前状态', required: false },
          { name: 'nextSteps', type: 'text', label: '下一步建议', required: false },
        ],
        tags: ['跟进', '沟通', '进度'],
        language: 'zh',
        tone: 'neutral',
        useCount: 0,
        successRate: 0,
        createdBy: 'system',
        isPublic: true,
      },
      {
        name: 'Thank You Note',
        category: 'appreciation',
        description: 'Express gratitude after meeting or collaboration',
        subject: 'Thank you for {{occasion}}',
        body: `Dear {{recipientName}},

I wanted to take a moment to express my sincere thanks for {{occasion}}.

{{specificAppreciation}}

{{futureOutlook}}

Looking forward to our continued collaboration.

Best regards,
{{senderName}}`,
        variables: [
          { name: 'occasion', type: 'text', label: 'Occasion', required: true },
          { name: 'specificAppreciation', type: 'text', label: 'Specific appreciation', required: false },
          { name: 'futureOutlook', type: 'text', label: 'Future outlook', required: false },
        ],
        tags: ['thanks', 'appreciation', 'relationship'],
        language: 'en',
        tone: 'formal',
        useCount: 0,
        successRate: 0,
        createdBy: 'system',
        isPublic: true,
      },
      {
        name: '项目更新报告',
        category: 'report',
        description: '定期项目进度汇报',
        subject: '{{projectName}} 项目周报 - {{reportDate}}',
        body: `各位好，

以下是{{projectName}}项目本周进展汇报：

【本周完成】
{{completedItems}}

【进行中】
{{inProgressItems}}

【下周计划】
{{nextWeekPlan}}

【风险与问题】
{{risksAndIssues}}

【需要支持】
{{supportNeeded}}

如有任何问题，请随时联系我。

{{senderName}}`,
        variables: [
          { name: 'projectName', type: 'text', label: '项目名称', required: true },
          { name: 'reportDate', type: 'date', label: '报告日期', required: true },
          { name: 'completedItems', type: 'text', label: '本周完成事项', required: true },
          { name: 'inProgressItems', type: 'text', label: '进行中事项', required: false },
          { name: 'nextWeekPlan', type: 'text', label: '下周计划', required: false },
          { name: 'risksAndIssues', type: 'text', label: '风险与问题', required: false, defaultValue: '暂无' },
          { name: 'supportNeeded', type: 'text', label: '需要支持', required: false, defaultValue: '暂无' },
        ],
        tags: ['报告', '项目', '周报'],
        language: 'zh',
        tone: 'formal',
        useCount: 0,
        successRate: 0,
        createdBy: 'system',
        isPublic: true,
      },
      {
        name: '道歉信',
        category: 'apology',
        description: '为问题或延误道歉',
        subject: '关于{{issue}}的致歉',
        body: `{{recipientTitle}}{{recipientName}}，您好！

首先，我对{{issue}}表示诚挚的歉意。

{{explanation}}

我们已经采取以下措施来解决这个问题：
{{remedialActions}}

{{compensation}}

我们非常重视与您的合作关系，会确保类似问题不再发生。

如果您有任何问题或需要进一步讨论，请随时联系我。

再次表示歉意，感谢您的理解！

{{senderName}}
{{senderTitle}}`,
        variables: [
          { name: 'issue', type: 'text', label: '问题描述', required: true },
          { name: 'explanation', type: 'text', label: '原因说明', required: false },
          { name: 'remedialActions', type: 'text', label: '补救措施', required: true },
          { name: 'compensation', type: 'text', label: '补偿方案', required: false },
        ],
        tags: ['道歉', '客户服务', '问题处理'],
        language: 'zh',
        tone: 'formal',
        useCount: 0,
        successRate: 0,
        createdBy: 'system',
        isPublic: true,
      },
    ];

    defaultTemplates.forEach((t, index) => {
      const template: EmailTemplate = {
        ...t,
        id: `template_${index + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      templates.set(template.id, template);
    });
  }

  /**
   * Get all templates
   */
  getTemplates(category?: string, language?: string): EmailTemplate[] {
    let result = Array.from(templates.values());

    if (category) {
      result = result.filter(t => t.category === category);
    }

    if (language) {
      result = result.filter(t => t.language === language || t.language === 'auto');
    }

    return result.sort((a, b) => b.useCount - a.useCount);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): EmailTemplate | null {
    return templates.get(templateId) || null;
  }

  /**
   * Create new template
   */
  createTemplate(
    template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'useCount' | 'successRate'>
  ): EmailTemplate {
    const newTemplate: EmailTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      useCount: 0,
      successRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  /**
   * Adapt template to context
   */
  async adaptTemplate(
    templateId: string,
    context: TemplateContext
  ): Promise<AdaptedTemplate> {
    const template = templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Basic variable replacement
    let subject = template.subject;
    let body = template.body;

    // Replace recipient variables
    subject = subject.replace(/\{\{recipientName\}\}/g, context.recipient.name || '');
    subject = subject.replace(/\{\{recipientTitle\}\}/g, context.recipient.title ? `${context.recipient.title} ` : '');
    body = body.replace(/\{\{recipientName\}\}/g, context.recipient.name || '');
    body = body.replace(/\{\{recipientTitle\}\}/g, context.recipient.title ? `${context.recipient.title} ` : '');

    // Replace sender variables
    body = body.replace(/\{\{senderName\}\}/g, context.sender.name);
    body = body.replace(/\{\{senderTitle\}\}/g, context.sender.title || '');
    body = body.replace(/\{\{senderCompany\}\}/g, context.sender.company || '');
    body = body.replace(/\{\{senderSignature\}\}/g, `${context.sender.name}\n${context.sender.title || ''}\n${context.sender.company || ''}`);

    // Replace custom variables
    if (context.customVariables) {
      for (const [key, value] of Object.entries(context.customVariables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      }
    }

    // AI-powered adaptation
    const prompt = `优化以下邮件模板，使其更适合收件人：

收件人信息：
- 姓名: ${context.recipient.name || '未知'}
- 公司: ${context.recipient.company || '未知'}
- 职位: ${context.recipient.title || '未知'}
- 关系: ${context.recipient.relationship || '未知'}
- 之前互动次数: ${context.recipient.previousInteractions || 0}
- 偏好语言: ${context.recipient.preferredLanguage || 'auto'}

发件人信息：
- 姓名: ${context.sender.name}
- 公司: ${context.sender.company || ''}
- 职位: ${context.sender.title || ''}

邮件目的: ${context.purpose}
紧急程度: ${context.urgency || 'normal'}

当前邮件：
主题: ${subject}
正文:
${body}

请返回 JSON：
{
  "subject": "优化后的主题",
  "body": "优化后的正文",
  "suggestions": ["改进建议1", "改进建议2"],
  "confidenceScore": 0.85,
  "alternatives": [
    {
      "subject": "备选主题",
      "body": "备选正文",
      "reason": "适用场景"
    }
  ]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: template.tone === 'formal' ? 'professional' : 'friendly',
        length: 'detailed',
      });

      const result = JSON.parse(response.replies[0].content);

      // Update template use count
      template.useCount++;
      template.updatedAt = new Date();

      return {
        subject: result.subject || subject,
        body: result.body || body,
        suggestions: result.suggestions || [],
        confidenceScore: result.confidenceScore || 0.7,
        alternatives: result.alternatives || [],
      };
    } catch {
      // Return basic adaptation if AI fails
      return {
        subject,
        body,
        suggestions: ['检查变量是否都已填写', '根据收件人关系调整语气'],
        confidenceScore: 0.5,
        alternatives: [],
      };
    }
  }

  /**
   * Recommend templates based on context
   */
  async recommendTemplates(
    purpose: string,
    recipientInfo?: Partial<TemplateContext['recipient']>
  ): Promise<TemplateRecommendation[]> {
    const allTemplates = Array.from(templates.values());

    const prompt = `根据以下需求推荐最合适的邮件模板：

目的: ${purpose}
收件人: ${recipientInfo?.name || '未知'} (${recipientInfo?.relationship || '未知关系'})

可用模板:
${allTemplates.map(t => `- ${t.id}: ${t.name} (${t.category}) - ${t.description}`).join('\n')}

返回 JSON 数组（最多3个推荐）：
[
  {
    "templateId": "template_id",
    "matchScore": 0.9,
    "reason": "推荐原因",
    "adaptations": ["建议的调整1", "建议的调整2"]
  }
]`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });

      const recommendations = JSON.parse(response.replies[0].content);

      return recommendations.map((rec: any) => ({
        template: templates.get(rec.templateId)!,
        matchScore: rec.matchScore,
        reason: rec.reason,
        adaptations: rec.adaptations || [],
      })).filter((rec: TemplateRecommendation) => rec.template);
    } catch {
      // Return top templates by usage
      return allTemplates
        .slice(0, 3)
        .map(template => ({
          template,
          matchScore: 0.5,
          reason: '基于使用频率推荐',
          adaptations: [],
        }));
    }
  }

  /**
   * Learn from email success
   */
  recordTemplateSuccess(
    templateId: string,
    gotResponse: boolean,
    responseTime?: number,
    sentiment?: 'positive' | 'negative' | 'neutral'
  ): void {
    const template = templates.get(templateId);
    if (!template) return;

    // Update analytics
    let templateAnalytics = analytics.get(templateId);
    if (!templateAnalytics) {
      templateAnalytics = {
        templateId,
        totalUses: 0,
        responseRate: 0,
        avgResponseTime: 0,
        positiveResponses: 0,
        negativeResponses: 0,
        noResponse: 0,
        byRecipientType: {},
      };
    }

    templateAnalytics.totalUses++;

    if (gotResponse) {
      if (sentiment === 'positive') {
        templateAnalytics.positiveResponses++;
      } else if (sentiment === 'negative') {
        templateAnalytics.negativeResponses++;
      }

      if (responseTime) {
        templateAnalytics.avgResponseTime =
          (templateAnalytics.avgResponseTime * (templateAnalytics.totalUses - 1) + responseTime) /
          templateAnalytics.totalUses;
      }
    } else {
      templateAnalytics.noResponse++;
    }

    templateAnalytics.responseRate =
      (templateAnalytics.totalUses - templateAnalytics.noResponse) / templateAnalytics.totalUses;

    analytics.set(templateId, templateAnalytics);

    // Update template success rate
    template.successRate = templateAnalytics.responseRate * 100;
    template.updatedAt = new Date();
  }

  /**
   * Get template analytics
   */
  getTemplateAnalytics(templateId: string): TemplateAnalytics | null {
    return analytics.get(templateId) || null;
  }

  /**
   * Generate template from example email
   */
  async generateTemplateFromEmail(
    email: { subject: string; body: string },
    name: string,
    category: string
  ): Promise<EmailTemplate> {
    const prompt = `将以下邮件转换为可重用的模板，识别可变部分：

主题: ${email.subject}
正文:
${email.body}

要求：
1. 将具体信息（日期、名字、数字等）替换为变量 {{variableName}}
2. 保持邮件的结构和语气
3. 识别所有需要的变量

返回 JSON：
{
  "subject": "带变量的主题",
  "body": "带变量的正文",
  "variables": [
    {
      "name": "variableName",
      "type": "text|date|number",
      "label": "变量标签",
      "required": true|false
    }
  ],
  "description": "模板描述",
  "tags": ["标签1", "标签2"]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const result = JSON.parse(response.replies[0].content);

      return this.createTemplate({
        name,
        category,
        description: result.description || `从邮件生成的${category}模板`,
        subject: result.subject,
        body: result.body,
        variables: result.variables || [],
        tags: result.tags || [category],
        language: 'auto',
        tone: 'neutral',
        createdBy: 'user',
        isPublic: false,
      });
    } catch {
      // Create basic template
      return this.createTemplate({
        name,
        category,
        description: `从邮件生成的${category}模板`,
        subject: email.subject,
        body: email.body,
        variables: [],
        tags: [category],
        language: 'auto',
        tone: 'neutral',
        createdBy: 'user',
        isPublic: false,
      });
    }
  }

  /**
   * Get template categories
   */
  getCategories(): Array<{ id: string; name: string; count: number }> {
    const categoryMap = new Map<string, number>();

    templates.forEach(t => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1);
    });

    const categoryNames: Record<string, string> = {
      business: '商务沟通',
      meeting: '会议邀请',
      followup: '跟进邮件',
      appreciation: '感谢致意',
      report: '报告汇报',
      apology: '道歉信函',
      introduction: '自我介绍',
      request: '请求帮助',
      announcement: '公告通知',
    };

    return Array.from(categoryMap.entries()).map(([id, count]) => ({
      id,
      name: categoryNames[id] || id,
      count,
    }));
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): boolean {
    return templates.delete(templateId);
  }

  /**
   * Update template
   */
  updateTemplate(
    templateId: string,
    updates: Partial<Omit<EmailTemplate, 'id' | 'createdAt' | 'createdBy'>>
  ): EmailTemplate | null {
    const template = templates.get(templateId);
    if (!template) return null;

    Object.assign(template, updates, { updatedAt: new Date() });
    return template;
  }
}

export const smartTemplateService = new SmartTemplateService();
