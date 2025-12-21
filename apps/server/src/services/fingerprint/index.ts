/**
 * Sender DNA Fingerprinting Service
 * Behavioral biometrics for email sender verification
 */

import { AIService } from '../ai/index.js';

export interface WritingPattern {
  averageWordLength: number;
  averageSentenceLength: number;
  vocabularyRichness: number;
  punctuationFrequency: Record<string, number>;
  commonPhrases: string[];
  greetingStyle: string[];
  signoffStyle: string[];
  emojiUsage: boolean;
  formalityScore: number; // 0-1
  capitalizationPattern: 'normal' | 'all_lower' | 'all_caps' | 'mixed';
}

export interface TemporalPattern {
  typicalSendTimes: number[]; // hours of day
  typicalSendDays: number[]; // 0-6 for days of week
  averageResponseTime: number; // in minutes
  burstPatterns: boolean; // sends multiple emails in quick succession
  timezone: string;
}

export interface ContentPattern {
  topicAffinity: Record<string, number>;
  sentimentBaseline: number; // -1 to 1
  urgencyBaseline: number; // 0-1
  detailLevel: 'brief' | 'moderate' | 'detailed';
  questionFrequency: number;
  callToActionStyle: string;
}

export interface SenderFingerprint {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  sampleCount: number;
  writingPattern: WritingPattern;
  temporalPattern: TemporalPattern;
  contentPattern: ContentPattern;
  confidenceScore: number;
  anomalyThreshold: number;
}

export interface VerificationResult {
  isAuthentic: boolean;
  confidence: number;
  matchScore: number;
  anomalies: Array<{
    type: string;
    expected: any;
    actual: any;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  riskLevel: 'safe' | 'suspicious' | 'likely_impersonation';
  recommendations: string[];
}

export interface EmailSample {
  content: string;
  subject?: string;
  sentAt: Date;
  isReply: boolean;
}

// In-memory fingerprint storage (use database in production)
const fingerprintStore = new Map<string, SenderFingerprint>();

export class FingerprintService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Analyze writing patterns from email content
   */
  private analyzeWritingPattern(content: string): WritingPattern {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Average word length
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length || 0;

    // Average sentence length
    const avgSentenceLength = words.length / sentences.length || 0;

    // Vocabulary richness (unique words / total words)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const vocabularyRichness = uniqueWords.size / words.length || 0;

    // Punctuation frequency
    const punctuation: Record<string, number> = {};
    const punctMarks = content.match(/[.,!?;:'"()\-–—]/g) || [];
    punctMarks.forEach(p => {
      punctuation[p] = (punctuation[p] || 0) + 1;
    });

    // Common phrases (2-3 word combinations)
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = words.slice(i, i + 3).join(' ').toLowerCase();
      if (phrase.length > 5) phrases.push(phrase);
    }

    // Greeting detection
    const greetingPatterns = [
      /^(hi|hello|hey|dear|good morning|good afternoon|good evening)/im,
      /^(尊敬的|亲爱的|你好|您好)/m,
    ];
    const greetings = greetingPatterns
      .map(p => content.match(p)?.[0])
      .filter(Boolean) as string[];

    // Signoff detection
    const signoffPatterns = [
      /(best regards|regards|sincerely|thanks|thank you|cheers|best)/im,
      /(此致|祝好|谢谢|感谢)/m,
    ];
    const signoffs = signoffPatterns
      .map(p => content.match(p)?.[0])
      .filter(Boolean) as string[];

    // Emoji usage
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;
    const hasEmoji = emojiRegex.test(content);

    // Formality score based on various indicators
    let formalityScore = 0.5;
    if (content.includes('Dear ') || content.includes('尊敬的')) formalityScore += 0.2;
    if (content.includes('Sincerely') || content.includes('此致敬礼')) formalityScore += 0.2;
    if (hasEmoji) formalityScore -= 0.2;
    if (content.includes('!')) formalityScore -= 0.1;
    formalityScore = Math.max(0, Math.min(1, formalityScore));

    // Capitalization pattern
    const upperCount = (content.match(/[A-Z]/g) || []).length;
    const lowerCount = (content.match(/[a-z]/g) || []).length;
    let capitalizationPattern: WritingPattern['capitalizationPattern'] = 'normal';
    if (upperCount > lowerCount * 0.5) capitalizationPattern = 'all_caps';
    if (upperCount < lowerCount * 0.05) capitalizationPattern = 'all_lower';

    return {
      averageWordLength: avgWordLength,
      averageSentenceLength: avgSentenceLength,
      vocabularyRichness,
      punctuationFrequency: punctuation,
      commonPhrases: phrases.slice(0, 10),
      greetingStyle: greetings,
      signoffStyle: signoffs,
      emojiUsage: hasEmoji,
      formalityScore,
      capitalizationPattern,
    };
  }

  /**
   * Analyze temporal patterns from email samples
   */
  private analyzeTemporalPattern(samples: EmailSample[]): TemporalPattern {
    const sendHours = samples.map(s => new Date(s.sentAt).getHours());
    const sendDays = samples.map(s => new Date(s.sentAt).getDay());

    // Find most common hours
    const hourCounts: Record<number, number> = {};
    sendHours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
    const typicalHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([h]) => parseInt(h));

    // Find most common days
    const dayCounts: Record<number, number> = {};
    sendDays.forEach(d => dayCounts[d] = (dayCounts[d] || 0) + 1);
    const typicalDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([d]) => parseInt(d));

    // Check for burst patterns
    const sortedTimes = samples.map(s => new Date(s.sentAt).getTime()).sort();
    let burstCount = 0;
    for (let i = 1; i < sortedTimes.length; i++) {
      if (sortedTimes[i] - sortedTimes[i-1] < 5 * 60 * 1000) { // within 5 minutes
        burstCount++;
      }
    }
    const burstPatterns = burstCount > samples.length * 0.3;

    return {
      typicalSendTimes: typicalHours,
      typicalSendDays: typicalDays,
      averageResponseTime: 60, // Default, would need reply data
      burstPatterns,
      timezone: 'UTC', // Would need more data to determine
    };
  }

  /**
   * Analyze content patterns
   */
  private async analyzeContentPattern(samples: EmailSample[]): Promise<ContentPattern> {
    const allContent = samples.map(s => s.content).join('\n\n');

    // Use AI to analyze topics and sentiment
    const prompt = `分析以下邮件样本，提取发件人的内容特征：

${allContent.slice(0, 3000)}

返回 JSON 格式：
{
  "topicAffinity": {"topic1": 0.8, "topic2": 0.5},
  "sentimentBaseline": 0.3,
  "urgencyBaseline": 0.4,
  "detailLevel": "moderate",
  "questionFrequency": 0.3,
  "callToActionStyle": "direct"
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
        topicAffinity: {},
        sentimentBaseline: 0,
        urgencyBaseline: 0.5,
        detailLevel: 'moderate',
        questionFrequency: 0.2,
        callToActionStyle: 'mixed',
      };
    }
  }

  /**
   * Create or update sender fingerprint
   */
  async learnSender(
    email: string,
    name: string,
    samples: EmailSample[]
  ): Promise<SenderFingerprint> {
    const existingFingerprint = fingerprintStore.get(email);

    const writingPatterns = samples.map(s => this.analyzeWritingPattern(s.content));
    const temporalPattern = this.analyzeTemporalPattern(samples);
    const contentPattern = await this.analyzeContentPattern(samples);

    // Average writing patterns
    const avgWritingPattern: WritingPattern = {
      averageWordLength: writingPatterns.reduce((s, p) => s + p.averageWordLength, 0) / writingPatterns.length,
      averageSentenceLength: writingPatterns.reduce((s, p) => s + p.averageSentenceLength, 0) / writingPatterns.length,
      vocabularyRichness: writingPatterns.reduce((s, p) => s + p.vocabularyRichness, 0) / writingPatterns.length,
      punctuationFrequency: writingPatterns[0].punctuationFrequency,
      commonPhrases: [...new Set(writingPatterns.flatMap(p => p.commonPhrases))].slice(0, 20),
      greetingStyle: [...new Set(writingPatterns.flatMap(p => p.greetingStyle))],
      signoffStyle: [...new Set(writingPatterns.flatMap(p => p.signoffStyle))],
      emojiUsage: writingPatterns.some(p => p.emojiUsage),
      formalityScore: writingPatterns.reduce((s, p) => s + p.formalityScore, 0) / writingPatterns.length,
      capitalizationPattern: writingPatterns[0].capitalizationPattern,
    };

    const fingerprint: SenderFingerprint = {
      id: existingFingerprint?.id || `fp_${Date.now()}`,
      email,
      name,
      createdAt: existingFingerprint?.createdAt || new Date(),
      updatedAt: new Date(),
      sampleCount: (existingFingerprint?.sampleCount || 0) + samples.length,
      writingPattern: avgWritingPattern,
      temporalPattern,
      contentPattern,
      confidenceScore: Math.min(0.95, 0.5 + samples.length * 0.1),
      anomalyThreshold: 0.3,
    };

    fingerprintStore.set(email, fingerprint);
    return fingerprint;
  }

  /**
   * Verify if an email matches the sender's fingerprint
   */
  async verifySender(
    email: string,
    content: string,
    sentAt: Date
  ): Promise<VerificationResult> {
    const fingerprint = fingerprintStore.get(email);

    if (!fingerprint) {
      return {
        isAuthentic: true, // No fingerprint to compare against
        confidence: 0,
        matchScore: 0,
        anomalies: [],
        riskLevel: 'safe',
        recommendations: ['首次收到此发件人邮件，建议谨慎处理'],
      };
    }

    const currentPattern = this.analyzeWritingPattern(content);
    const anomalies: VerificationResult['anomalies'] = [];
    let totalScore = 0;
    let maxScore = 0;

    // Compare writing patterns
    // Word length
    maxScore += 1;
    const wordLengthDiff = Math.abs(currentPattern.averageWordLength - fingerprint.writingPattern.averageWordLength);
    if (wordLengthDiff < 1) {
      totalScore += 1;
    } else if (wordLengthDiff > 2) {
      anomalies.push({
        type: 'word_length',
        expected: fingerprint.writingPattern.averageWordLength.toFixed(1),
        actual: currentPattern.averageWordLength.toFixed(1),
        severity: wordLengthDiff > 3 ? 'high' : 'medium',
        description: '平均词长异常',
      });
    }

    // Sentence length
    maxScore += 1;
    const sentLengthDiff = Math.abs(currentPattern.averageSentenceLength - fingerprint.writingPattern.averageSentenceLength);
    if (sentLengthDiff < 5) {
      totalScore += 1;
    } else if (sentLengthDiff > 10) {
      anomalies.push({
        type: 'sentence_length',
        expected: fingerprint.writingPattern.averageSentenceLength.toFixed(1),
        actual: currentPattern.averageSentenceLength.toFixed(1),
        severity: 'medium',
        description: '句子长度模式异常',
      });
    }

    // Formality
    maxScore += 1;
    const formalityDiff = Math.abs(currentPattern.formalityScore - fingerprint.writingPattern.formalityScore);
    if (formalityDiff < 0.2) {
      totalScore += 1;
    } else if (formalityDiff > 0.4) {
      anomalies.push({
        type: 'formality',
        expected: fingerprint.writingPattern.formalityScore.toFixed(2),
        actual: currentPattern.formalityScore.toFixed(2),
        severity: 'high',
        description: '正式程度突变，可能不是本人',
      });
    }

    // Emoji usage
    maxScore += 1;
    if (currentPattern.emojiUsage === fingerprint.writingPattern.emojiUsage) {
      totalScore += 1;
    } else {
      anomalies.push({
        type: 'emoji',
        expected: fingerprint.writingPattern.emojiUsage ? '使用表情' : '不使用表情',
        actual: currentPattern.emojiUsage ? '使用表情' : '不使用表情',
        severity: 'low',
        description: '表情使用习惯变化',
      });
    }

    // Greeting style
    maxScore += 1;
    const greetingMatch = fingerprint.writingPattern.greetingStyle.some(g =>
      content.toLowerCase().includes(g.toLowerCase())
    );
    if (greetingMatch || fingerprint.writingPattern.greetingStyle.length === 0) {
      totalScore += 1;
    } else {
      anomalies.push({
        type: 'greeting',
        expected: fingerprint.writingPattern.greetingStyle.join(', '),
        actual: currentPattern.greetingStyle.join(', ') || '无',
        severity: 'medium',
        description: '问候语风格变化',
      });
    }

    // Time pattern check
    maxScore += 1;
    const sentHour = sentAt.getHours();
    const isTypicalTime = fingerprint.temporalPattern.typicalSendTimes.includes(sentHour);
    if (isTypicalTime) {
      totalScore += 1;
    } else {
      const hourDiff = Math.min(
        ...fingerprint.temporalPattern.typicalSendTimes.map(h => Math.abs(h - sentHour))
      );
      if (hourDiff > 4) {
        anomalies.push({
          type: 'send_time',
          expected: `通常在 ${fingerprint.temporalPattern.typicalSendTimes.join(', ')} 点发送`,
          actual: `${sentHour} 点`,
          severity: hourDiff > 8 ? 'high' : 'medium',
          description: '发送时间异常',
        });
      }
    }

    const matchScore = totalScore / maxScore;
    const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;

    let riskLevel: VerificationResult['riskLevel'] = 'safe';
    if (highSeverityCount >= 2 || matchScore < 0.4) {
      riskLevel = 'likely_impersonation';
    } else if (highSeverityCount >= 1 || matchScore < 0.6) {
      riskLevel = 'suspicious';
    }

    const recommendations: string[] = [];
    if (riskLevel === 'likely_impersonation') {
      recommendations.push('⚠️ 高风险：这封邮件可能不是来自真正的发件人');
      recommendations.push('建议通过其他渠道（电话、即时通讯）确认');
      recommendations.push('不要点击任何链接或下载附件');
    } else if (riskLevel === 'suspicious') {
      recommendations.push('⚡ 中等风险：邮件风格与历史记录有差异');
      recommendations.push('建议仔细核实邮件内容的真实性');
    }

    return {
      isAuthentic: riskLevel === 'safe',
      confidence: fingerprint.confidenceScore,
      matchScore,
      anomalies,
      riskLevel,
      recommendations,
    };
  }

  /**
   * Get fingerprint for a sender
   */
  getFingerprint(email: string): SenderFingerprint | null {
    return fingerprintStore.get(email) || null;
  }

  /**
   * Get all fingerprints
   */
  getAllFingerprints(): SenderFingerprint[] {
    return Array.from(fingerprintStore.values());
  }

  /**
   * AI-powered impersonation detection
   */
  async detectImpersonation(
    email: string,
    content: string,
    claimedSender: string
  ): Promise<{
    isImpersonation: boolean;
    confidence: number;
    indicators: string[];
    recommendation: string;
  }> {
    const prompt = `分析这封邮件是否可能是冒充/钓鱼邮件：

发件人声称是：${claimedSender}
发件人邮箱：${email}
邮件内容：
${content}

检查以下指标：
1. 邮箱域名是否与声称的身份匹配
2. 是否有紧迫性语言诱导快速行动
3. 是否要求敏感信息（密码、账号、付款）
4. 语言风格是否专业/符合身份
5. 是否有可疑链接或附件

返回 JSON：
{
  "isImpersonation": true/false,
  "confidence": 0.85,
  "indicators": ["可疑指标1", "可疑指标2"],
  "recommendation": "建议"
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
        isImpersonation: false,
        confidence: 0.5,
        indicators: [],
        recommendation: '无法完成分析，建议人工审核',
      };
    }
  }
}

export const fingerprintService = new FingerprintService();
