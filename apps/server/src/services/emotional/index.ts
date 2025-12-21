/**
 * Emotional Intelligence Layer Service
 * Deep sentiment analysis and empathy suggestions
 */

import { AIService } from '../ai/index.js';

export interface EmotionAnalysis {
  primary: {
    emotion: EmotionType;
    intensity: number; // 0-10
    confidence: number; // 0-1
  };
  secondary: Array<{
    emotion: EmotionType;
    intensity: number;
    confidence: number;
  }>;
  hidden: {
    emotion: EmotionType | null;
    reasoning: string;
  };
  triggers: string[];
  sentiment: {
    score: number; // -1 to 1
    label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  };
}

export type EmotionType =
  | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'disgusted'
  | 'anxious' | 'frustrated' | 'disappointed' | 'hopeful' | 'grateful'
  | 'confused' | 'excited' | 'relieved' | 'nervous' | 'confident'
  | 'hurt' | 'jealous' | 'proud' | 'ashamed' | 'neutral';

export interface EmpatheticResponse {
  suggestedTone: string;
  openingOptions: string[];
  keyMessages: string[];
  closingOptions: string[];
  wordsToAvoid: string[];
  wordsToUse: string[];
  emotionalTemperature: 'warm' | 'neutral' | 'cool' | 'professional';
  fullDraft: string;
}

export interface ConflictAnalysis {
  conflictDetected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'misunderstanding' | 'disagreement' | 'frustration' | 'accusation' | 'passive_aggressive' | 'none';
  rootCause: string;
  deescalationStrategies: string[];
  suggestedResponse: string;
  warningFlags: string[];
}

export interface TimingRecommendation {
  bestTimeToRespond: {
    recommendation: 'immediate' | 'within_hours' | 'next_day' | 'wait';
    hours?: number;
    reason: string;
  };
  currentEmotionalState: string;
  cooldownNeeded: boolean;
  cooldownHours?: number;
  risksOfImmediateResponse: string[];
}

export interface EmpathyScore {
  score: number; // 0-100
  breakdown: {
    acknowledgement: number;
    validation: number;
    understanding: number;
    supportiveness: number;
    appropriateTone: number;
  };
  suggestions: string[];
}

export interface CommunicationStyle {
  directness: number; // 0-1, 0 = very indirect, 1 = very direct
  formality: number; // 0-1
  emotionalExpression: number; // 0-1
  detailOrientation: number; // 0-1
  assertiveness: number; // 0-1
  adaptationSuggestions: string[];
}

export class EmotionalIntelligenceService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Analyze emotions in email content
   */
  async analyzeEmotions(content: string, context?: {
    previousEmails?: string[];
    senderRelationship?: string;
    subject?: string;
  }): Promise<EmotionAnalysis> {
    const prompt = `作为情感分析专家，深度分析以下邮件中的情绪：

邮件内容:
${content}

${context?.subject ? `主题: ${context.subject}` : ''}
${context?.senderRelationship ? `发件人关系: ${context.senderRelationship}` : ''}
${context?.previousEmails ? `之前邮件上下文: ${context.previousEmails.slice(-2).join('\n---\n')}` : ''}

请分析:
1. 主要情绪及其强度 (0-10)
2. 次要情绪（可能多个）
3. 隐藏的真实情绪（表面愤怒可能是受伤，表面冷淡可能是失望）
4. 情绪触发点
5. 整体情感分数 (-1 到 1)

返回 JSON:
{
  "primary": {
    "emotion": "情绪类型",
    "intensity": 7,
    "confidence": 0.85
  },
  "secondary": [
    {"emotion": "情绪", "intensity": 5, "confidence": 0.7}
  ],
  "hidden": {
    "emotion": "隐藏情绪或null",
    "reasoning": "推理原因"
  },
  "triggers": ["触发点1", "触发点2"],
  "sentiment": {
    "score": 0.3,
    "label": "positive"
  }
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      return JSON.parse(response.replies[0].content);
    } catch {
      return {
        primary: { emotion: 'neutral', intensity: 5, confidence: 0.5 },
        secondary: [],
        hidden: { emotion: null, reasoning: '无法完成分析' },
        triggers: [],
        sentiment: { score: 0, label: 'neutral' },
      };
    }
  }

  /**
   * Generate empathetic response suggestions
   */
  async generateEmpatheticResponse(
    emailContent: string,
    emotionAnalysis: EmotionAnalysis,
    responseGoal: string
  ): Promise<EmpatheticResponse> {
    const prompt = `基于以下情绪分析，生成一个富有同理心的回复建议：

原始邮件:
${emailContent}

情绪分析:
- 主要情绪: ${emotionAnalysis.primary.emotion} (强度: ${emotionAnalysis.primary.intensity}/10)
- 隐藏情绪: ${emotionAnalysis.hidden.emotion || '无'} (${emotionAnalysis.hidden.reasoning})
- 情绪触发点: ${emotionAnalysis.triggers.join(', ')}
- 整体情感: ${emotionAnalysis.sentiment.label}

回复目标: ${responseGoal}

请提供:
1. 建议的语气
2. 多个开头选项（展示理解和同理心）
3. 关键要传达的信息
4. 多个结尾选项
5. 应避免的词汇
6. 推荐使用的词汇
7. 情感温度建议
8. 完整的回复草稿

返回 JSON:
{
  "suggestedTone": "语气描述",
  "openingOptions": ["选项1", "选项2", "选项3"],
  "keyMessages": ["信息1", "信息2"],
  "closingOptions": ["选项1", "选项2"],
  "wordsToAvoid": ["词1", "词2"],
  "wordsToUse": ["词1", "词2"],
  "emotionalTemperature": "warm",
  "fullDraft": "完整回复内容"
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      return JSON.parse(response.replies[0].content);
    } catch {
      return {
        suggestedTone: 'professional and understanding',
        openingOptions: ['Thank you for sharing your thoughts.'],
        keyMessages: ['I understand your perspective.'],
        closingOptions: ['Please let me know if you have any questions.'],
        wordsToAvoid: [],
        wordsToUse: [],
        emotionalTemperature: 'neutral',
        fullDraft: 'Thank you for your email. I understand and will respond thoughtfully.',
      };
    }
  }

  /**
   * Analyze for conflicts and suggest de-escalation
   */
  async analyzeConflict(
    emailContent: string,
    conversationHistory?: string[]
  ): Promise<ConflictAnalysis> {
    const prompt = `分析以下邮件是否存在冲突或紧张情绪，并提供化解策略：

当前邮件:
${emailContent}

${conversationHistory ? `对话历史:\n${conversationHistory.join('\n---\n')}` : ''}

检测:
1. 是否存在冲突
2. 冲突严重程度
3. 冲突类型（误解、分歧、沮丧、指责、被动攻击）
4. 根本原因
5. 降级策略
6. 建议回复
7. 警告信号

返回 JSON:
{
  "conflictDetected": true,
  "severity": "medium",
  "type": "frustration",
  "rootCause": "原因分析",
  "deescalationStrategies": ["策略1", "策略2"],
  "suggestedResponse": "建议回复内容",
  "warningFlags": ["警告1", "警告2"]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      return JSON.parse(response.replies[0].content);
    } catch {
      return {
        conflictDetected: false,
        severity: 'low',
        type: 'none',
        rootCause: '无法分析',
        deescalationStrategies: [],
        suggestedResponse: '',
        warningFlags: [],
      };
    }
  }

  /**
   * Get timing recommendation for response
   */
  async getTimingRecommendation(
    emailContent: string,
    emotionAnalysis: EmotionAnalysis,
    yourEmotionalState?: string
  ): Promise<TimingRecommendation> {
    const prompt = `分析最佳回复时机：

收到的邮件:
${emailContent}

对方情绪分析:
- 主要情绪: ${emotionAnalysis.primary.emotion} (强度: ${emotionAnalysis.primary.intensity}/10)
- 整体情感: ${emotionAnalysis.sentiment.label}

${yourEmotionalState ? `你当前的情绪状态: ${yourEmotionalState}` : ''}

请分析:
1. 最佳回复时机
2. 对方当前可能的情绪状态
3. 是否需要冷静期
4. 立即回复的风险

返回 JSON:
{
  "bestTimeToRespond": {
    "recommendation": "within_hours",
    "hours": 4,
    "reason": "原因"
  },
  "currentEmotionalState": "状态描述",
  "cooldownNeeded": false,
  "cooldownHours": null,
  "risksOfImmediateResponse": ["风险1", "风险2"]
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
        bestTimeToRespond: {
          recommendation: 'within_hours',
          hours: 2,
          reason: '保持及时响应',
        },
        currentEmotionalState: 'unknown',
        cooldownNeeded: false,
        risksOfImmediateResponse: [],
      };
    }
  }

  /**
   * Score empathy level of a draft response
   */
  async scoreEmpathy(
    originalEmail: string,
    draftResponse: string,
    emotionAnalysis: EmotionAnalysis
  ): Promise<EmpathyScore> {
    const prompt = `评估以下回复的同理心水平：

原始邮件:
${originalEmail}

对方情绪: ${emotionAnalysis.primary.emotion} (强度: ${emotionAnalysis.primary.intensity}/10)

草稿回复:
${draftResponse}

评分维度 (0-100):
1. 情感认可 - 是否承认对方的感受
2. 情绪验证 - 是否让对方感到被理解
3. 理解深度 - 是否真正理解问题核心
4. 支持性 - 是否提供情感支持
5. 语气适当性 - 语气是否匹配对方情绪

返回 JSON:
{
  "score": 75,
  "breakdown": {
    "acknowledgement": 80,
    "validation": 70,
    "understanding": 75,
    "supportiveness": 80,
    "appropriateTone": 70
  },
  "suggestions": ["建议1", "建议2"]
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
        score: 50,
        breakdown: {
          acknowledgement: 50,
          validation: 50,
          understanding: 50,
          supportiveness: 50,
          appropriateTone: 50,
        },
        suggestions: ['无法完成评分'],
      };
    }
  }

  /**
   * Analyze communication style
   */
  async analyzeCommunicationStyle(
    emailSamples: string[]
  ): Promise<CommunicationStyle> {
    const prompt = `分析以下邮件样本的沟通风格：

${emailSamples.slice(0, 5).join('\n\n---\n\n')}

评估维度 (0-1):
1. 直接性 - 0 非常间接, 1 非常直接
2. 正式程度 - 0 非常随意, 1 非常正式
3. 情感表达 - 0 很少表达情感, 1 频繁表达
4. 细节导向 - 0 简洁, 1 详细
5. 果断性 - 0 委婉, 1 果断

返回 JSON:
{
  "directness": 0.7,
  "formality": 0.6,
  "emotionalExpression": 0.4,
  "detailOrientation": 0.5,
  "assertiveness": 0.6,
  "adaptationSuggestions": ["建议1", "建议2"]
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
        directness: 0.5,
        formality: 0.5,
        emotionalExpression: 0.5,
        detailOrientation: 0.5,
        assertiveness: 0.5,
        adaptationSuggestions: [],
      };
    }
  }

  /**
   * Adapt response to match recipient's communication style
   */
  async adaptToStyle(
    draftResponse: string,
    targetStyle: CommunicationStyle
  ): Promise<string> {
    const prompt = `根据目标沟通风格调整以下回复：

原始回复:
${draftResponse}

目标风格:
- 直接性: ${targetStyle.directness} (${targetStyle.directness > 0.6 ? '直接' : '委婉'})
- 正式程度: ${targetStyle.formality} (${targetStyle.formality > 0.6 ? '正式' : '随意'})
- 情感表达: ${targetStyle.emotionalExpression} (${targetStyle.emotionalExpression > 0.5 ? '多' : '少'})
- 详细程度: ${targetStyle.detailOrientation} (${targetStyle.detailOrientation > 0.5 ? '详细' : '简洁'})
- 果断程度: ${targetStyle.assertiveness} (${targetStyle.assertiveness > 0.5 ? '果断' : '委婉'})

请调整回复以匹配目标风格，只返回调整后的回复内容。`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'moderate',
      });

      return response.replies[0].content;
    } catch {
      return draftResponse;
    }
  }

  /**
   * Detect potential misunderstandings
   */
  async detectMisunderstandings(
    emailThread: string[]
  ): Promise<{
    misunderstandings: Array<{
      location: string;
      description: string;
      suggestion: string;
    }>;
    clarificationNeeded: boolean;
    suggestedClarification?: string;
  }> {
    const prompt = `分析以下邮件对话，检测可能的误解：

${emailThread.join('\n\n---\n\n')}

检测:
1. 是否有信息被误解
2. 是否有隐含的假设
3. 是否需要澄清

返回 JSON:
{
  "misunderstandings": [
    {
      "location": "第N封邮件中...",
      "description": "误解描述",
      "suggestion": "澄清建议"
    }
  ],
  "clarificationNeeded": true,
  "suggestedClarification": "建议的澄清内容"
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      return JSON.parse(response.replies[0].content);
    } catch {
      return {
        misunderstandings: [],
        clarificationNeeded: false,
      };
    }
  }

  /**
   * Get quick emotion summary
   */
  getEmotionEmoji(emotion: EmotionType): string {
    const emojiMap: Record<EmotionType, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      fearful: '😨',
      surprised: '😲',
      disgusted: '🤢',
      anxious: '😰',
      frustrated: '😤',
      disappointed: '😞',
      hopeful: '🤞',
      grateful: '🙏',
      confused: '😕',
      excited: '🎉',
      relieved: '😌',
      nervous: '😬',
      confident: '😎',
      hurt: '💔',
      jealous: '😒',
      proud: '🥳',
      ashamed: '😳',
      neutral: '😐',
    };

    return emojiMap[emotion] || '😐';
  }
}

export const emotionalIntelligenceService = new EmotionalIntelligenceService();
