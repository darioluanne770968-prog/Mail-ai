/**
 * Email A/B Testing Service
 * Test different email versions and track performance
 */

import { AIService } from '../ai/index.js';

export interface EmailVariant {
  id: string;
  name: string;
  subject: string;
  body: string;
  tone: string;
  callToAction?: string;
  signoff: string;
}

export interface ABTest {
  id: string;
  userId: string;
  name: string;
  description: string;
  goal: 'open_rate' | 'reply_rate' | 'click_rate' | 'sentiment' | 'response_time';
  variants: EmailVariant[];
  audience: {
    type: 'random' | 'segment' | 'all';
    segmentRules?: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
    sampleSize?: number;
  };
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results?: ABTestResults;
}

export interface VariantStats {
  variantId: string;
  variantName: string;
  sent: number;
  opened: number;
  replied: number;
  clicked: number;
  avgResponseTime: number; // minutes
  avgSentiment: number; // -1 to 1
  conversions: number;
}

export interface ABTestResults {
  testId: string;
  totalSent: number;
  variantStats: VariantStats[];
  winner: {
    variantId: string;
    variantName: string;
    metric: string;
    value: number;
    confidence: number; // Statistical confidence
    improvement: number; // % improvement over control
  } | null;
  insights: string[];
  recommendations: string[];
  statisticalSignificance: boolean;
}

export interface EmailSend {
  id: string;
  testId: string;
  variantId: string;
  recipientEmail: string;
  sentAt: Date;
  openedAt?: Date;
  repliedAt?: Date;
  clickedAt?: Date;
  replyContent?: string;
  replySentiment?: number;
}

// In-memory storage
const tests = new Map<string, ABTest>();
const sends = new Map<string, EmailSend>();

export class ABTestingService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Create a new A/B test
   */
  createTest(
    userId: string,
    config: {
      name: string;
      description: string;
      goal: ABTest['goal'];
      baseEmail: { subject: string; body: string };
      variantCount?: number;
    }
  ): ABTest {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const test: ABTest = {
      id: testId,
      userId,
      name: config.name,
      description: config.description,
      goal: config.goal,
      variants: [
        {
          id: 'control',
          name: '对照组 (原始版本)',
          subject: config.baseEmail.subject,
          body: config.baseEmail.body,
          tone: 'original',
          signoff: 'Best regards',
        },
      ],
      audience: {
        type: 'random',
        sampleSize: 100,
      },
      status: 'draft',
      createdAt: new Date(),
    };

    tests.set(testId, test);
    return test;
  }

  /**
   * Generate variant suggestions using AI
   */
  async generateVariants(
    testId: string,
    count: number = 2
  ): Promise<EmailVariant[]> {
    const test = tests.get(testId);
    if (!test || test.variants.length === 0) return [];

    const control = test.variants[0];

    const prompt = `基于以下邮件，生成 ${count} 个不同的变体版本用于 A/B 测试。
目标: ${this.getGoalDescription(test.goal)}

原始邮件:
主题: ${control.subject}
内容: ${control.body}

为每个变体尝试不同的策略：
- 变体1: 更简洁直接
- 变体2: 更个性化和友好
- 变体3: 更紧迫和行动导向
- 变体4: 更详细和专业

返回 JSON 数组：
[
  {
    "name": "变体名称",
    "subject": "主题",
    "body": "正文",
    "tone": "语气描述",
    "callToAction": "行动号召",
    "signoff": "结尾问候",
    "strategy": "使用的策略说明"
  }
]`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const variants = JSON.parse(response.replies[0].content);

      const newVariants: EmailVariant[] = variants.slice(0, count).map((v: any, index: number) => ({
        id: `variant_${index + 1}`,
        name: v.name || `变体 ${index + 1}`,
        subject: v.subject,
        body: v.body,
        tone: v.tone,
        callToAction: v.callToAction,
        signoff: v.signoff || 'Best regards',
      }));

      test.variants.push(...newVariants);
      return newVariants;
    } catch {
      return [];
    }
  }

  /**
   * Get goal description
   */
  private getGoalDescription(goal: ABTest['goal']): string {
    const descriptions: Record<ABTest['goal'], string> = {
      open_rate: '提高邮件打开率',
      reply_rate: '提高回复率',
      click_rate: '提高链接点击率',
      sentiment: '获得更积极的回复',
      response_time: '缩短回复时间',
    };
    return descriptions[goal];
  }

  /**
   * Add a custom variant
   */
  addVariant(testId: string, variant: Omit<EmailVariant, 'id'>): EmailVariant | null {
    const test = tests.get(testId);
    if (!test) return null;

    const newVariant: EmailVariant = {
      ...variant,
      id: `variant_${test.variants.length}`,
    };

    test.variants.push(newVariant);
    return newVariant;
  }

  /**
   * Start the A/B test
   */
  startTest(testId: string): ABTest | null {
    const test = tests.get(testId);
    if (!test || test.status !== 'draft') return null;

    if (test.variants.length < 2) {
      throw new Error('A/B test requires at least 2 variants');
    }

    test.status = 'active';
    test.startedAt = new Date();
    return test;
  }

  /**
   * Record an email send
   */
  recordSend(
    testId: string,
    variantId: string,
    recipientEmail: string
  ): EmailSend | null {
    const test = tests.get(testId);
    if (!test || test.status !== 'active') return null;

    const send: EmailSend = {
      id: `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testId,
      variantId,
      recipientEmail,
      sentAt: new Date(),
    };

    sends.set(send.id, send);
    return send;
  }

  /**
   * Get which variant to use for next send
   */
  getNextVariant(testId: string): EmailVariant | null {
    const test = tests.get(testId);
    if (!test || test.status !== 'active') return null;

    // Count sends per variant
    const variantCounts = new Map<string, number>();
    test.variants.forEach(v => variantCounts.set(v.id, 0));

    for (const send of sends.values()) {
      if (send.testId === testId) {
        const count = variantCounts.get(send.variantId) || 0;
        variantCounts.set(send.variantId, count + 1);
      }
    }

    // Return variant with least sends (round-robin)
    let minCount = Infinity;
    let selectedVariant: EmailVariant | null = null;

    for (const variant of test.variants) {
      const count = variantCounts.get(variant.id) || 0;
      if (count < minCount) {
        minCount = count;
        selectedVariant = variant;
      }
    }

    return selectedVariant;
  }

  /**
   * Record email opened
   */
  recordOpen(sendId: string): void {
    const send = sends.get(sendId);
    if (send && !send.openedAt) {
      send.openedAt = new Date();
    }
  }

  /**
   * Record email reply
   */
  async recordReply(sendId: string, replyContent: string): Promise<void> {
    const send = sends.get(sendId);
    if (send && !send.repliedAt) {
      send.repliedAt = new Date();
      send.replyContent = replyContent;

      // Analyze sentiment
      const prompt = `分析以下回复的情感倾向，返回 -1 到 1 之间的数值：

${replyContent.slice(0, 500)}

只返回数字`;

      try {
        const response = await this.aiService.generateReply({
          emailContent: prompt,
          tone: 'professional',
          length: 'concise',
        });
        send.replySentiment = parseFloat(response.replies[0].content) || 0;
      } catch {
        send.replySentiment = 0;
      }
    }
  }

  /**
   * Record link click
   */
  recordClick(sendId: string): void {
    const send = sends.get(sendId);
    if (send && !send.clickedAt) {
      send.clickedAt = new Date();
    }
  }

  /**
   * Calculate test results
   */
  calculateResults(testId: string): ABTestResults | null {
    const test = tests.get(testId);
    if (!test) return null;

    const testSends = Array.from(sends.values()).filter(s => s.testId === testId);

    if (testSends.length === 0) {
      return {
        testId,
        totalSent: 0,
        variantStats: [],
        winner: null,
        insights: [],
        recommendations: ['需要更多数据来分析结果'],
        statisticalSignificance: false,
      };
    }

    // Calculate stats per variant
    const variantStats: VariantStats[] = test.variants.map(variant => {
      const variantSends = testSends.filter(s => s.variantId === variant.id);
      const opened = variantSends.filter(s => s.openedAt).length;
      const replied = variantSends.filter(s => s.repliedAt).length;
      const clicked = variantSends.filter(s => s.clickedAt).length;

      // Calculate average response time
      const responseTimes = variantSends
        .filter(s => s.repliedAt)
        .map(s => (s.repliedAt!.getTime() - s.sentAt.getTime()) / (1000 * 60));
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Calculate average sentiment
      const sentiments = variantSends
        .filter(s => s.replySentiment !== undefined)
        .map(s => s.replySentiment!);
      const avgSentiment = sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;

      return {
        variantId: variant.id,
        variantName: variant.name,
        sent: variantSends.length,
        opened,
        replied,
        clicked,
        avgResponseTime,
        avgSentiment,
        conversions: replied, // Simplified - could be different metric
      };
    });

    // Determine winner based on goal
    const winner = this.determineWinner(test.goal, variantStats);

    // Generate insights
    const insights = this.generateInsights(variantStats, test.goal);

    // Check statistical significance (simplified)
    const statisticalSignificance = testSends.length >= 100 && winner !== null && winner.confidence > 0.95;

    const results: ABTestResults = {
      testId,
      totalSent: testSends.length,
      variantStats,
      winner,
      insights,
      recommendations: this.generateRecommendations(winner, variantStats, test.goal),
      statisticalSignificance,
    };

    test.results = results;
    return results;
  }

  /**
   * Determine the winning variant
   */
  private determineWinner(
    goal: ABTest['goal'],
    stats: VariantStats[]
  ): ABTestResults['winner'] {
    if (stats.length < 2) return null;

    const control = stats.find(s => s.variantId === 'control');
    if (!control) return null;

    let bestVariant: VariantStats | null = null;
    let bestValue = -Infinity;

    for (const stat of stats) {
      let value: number;
      switch (goal) {
        case 'open_rate':
          value = stat.sent > 0 ? stat.opened / stat.sent : 0;
          break;
        case 'reply_rate':
          value = stat.sent > 0 ? stat.replied / stat.sent : 0;
          break;
        case 'click_rate':
          value = stat.sent > 0 ? stat.clicked / stat.sent : 0;
          break;
        case 'sentiment':
          value = stat.avgSentiment;
          break;
        case 'response_time':
          value = stat.avgResponseTime > 0 ? -stat.avgResponseTime : 0; // Negative because lower is better
          break;
      }

      if (value > bestValue) {
        bestValue = value;
        bestVariant = stat;
      }
    }

    if (!bestVariant) return null;

    // Calculate control value
    let controlValue: number;
    switch (goal) {
      case 'open_rate':
        controlValue = control.sent > 0 ? control.opened / control.sent : 0;
        break;
      case 'reply_rate':
        controlValue = control.sent > 0 ? control.replied / control.sent : 0;
        break;
      case 'click_rate':
        controlValue = control.sent > 0 ? control.clicked / control.sent : 0;
        break;
      case 'sentiment':
        controlValue = control.avgSentiment;
        break;
      case 'response_time':
        controlValue = control.avgResponseTime;
        break;
    }

    const improvement = controlValue !== 0
      ? ((bestValue - controlValue) / Math.abs(controlValue)) * 100
      : bestValue > 0 ? 100 : 0;

    // Simplified confidence calculation
    const totalSamples = stats.reduce((sum, s) => sum + s.sent, 0);
    const confidence = Math.min(0.99, 0.5 + (totalSamples / 1000));

    return {
      variantId: bestVariant.variantId,
      variantName: bestVariant.variantName,
      metric: goal,
      value: Math.abs(bestValue),
      confidence,
      improvement,
    };
  }

  /**
   * Generate insights from results
   */
  private generateInsights(stats: VariantStats[], goal: ABTest['goal']): string[] {
    const insights: string[] = [];

    // Compare rates
    const openRates = stats.map(s => ({
      name: s.variantName,
      rate: s.sent > 0 ? (s.opened / s.sent * 100).toFixed(1) : '0',
    }));

    const replyRates = stats.map(s => ({
      name: s.variantName,
      rate: s.sent > 0 ? (s.replied / s.sent * 100).toFixed(1) : '0',
    }));

    // Find best and worst
    const bestOpen = openRates.reduce((a, b) => parseFloat(a.rate) > parseFloat(b.rate) ? a : b);
    const bestReply = replyRates.reduce((a, b) => parseFloat(a.rate) > parseFloat(b.rate) ? a : b);

    insights.push(`打开率最高: ${bestOpen.name} (${bestOpen.rate}%)`);
    insights.push(`回复率最高: ${bestReply.name} (${bestReply.rate}%)`);

    // Sentiment insights
    const sentiments = stats.filter(s => s.avgSentiment !== 0);
    if (sentiments.length > 0) {
      const bestSentiment = sentiments.reduce((a, b) => a.avgSentiment > b.avgSentiment ? a : b);
      insights.push(`最积极回复: ${bestSentiment.variantName} (情感分数: ${bestSentiment.avgSentiment.toFixed(2)})`);
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    winner: ABTestResults['winner'],
    stats: VariantStats[],
    goal: ABTest['goal']
  ): string[] {
    const recommendations: string[] = [];

    if (!winner) {
      recommendations.push('需要更多数据来确定最佳版本');
      return recommendations;
    }

    if (winner.improvement > 20) {
      recommendations.push(`强烈建议使用 "${winner.variantName}"，提升达 ${winner.improvement.toFixed(1)}%`);
    } else if (winner.improvement > 5) {
      recommendations.push(`建议使用 "${winner.variantName}"，有一定提升`);
    } else {
      recommendations.push('各版本差异不大，可以选择任意版本');
    }

    // Goal-specific recommendations
    switch (goal) {
      case 'open_rate':
        recommendations.push('考虑测试不同的主题行以进一步提高打开率');
        break;
      case 'reply_rate':
        recommendations.push('考虑优化行动号召以提高回复率');
        break;
      case 'sentiment':
        recommendations.push('分析高情感分数回复的共同特点');
        break;
    }

    return recommendations;
  }

  /**
   * Complete a test
   */
  completeTest(testId: string): ABTest | null {
    const test = tests.get(testId);
    if (!test || test.status !== 'active') return null;

    test.status = 'completed';
    test.completedAt = new Date();
    this.calculateResults(testId);

    return test;
  }

  /**
   * Get all tests for a user
   */
  getUserTests(userId: string): ABTest[] {
    return Array.from(tests.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): ABTest | null {
    return tests.get(testId) || null;
  }

  /**
   * AI-powered variant optimization suggestions
   */
  async getOptimizationSuggestions(testId: string): Promise<string[]> {
    const test = tests.get(testId);
    if (!test || !test.results) return [];

    const prompt = `基于以下 A/B 测试结果，提供优化建议：

测试目标: ${this.getGoalDescription(test.goal)}

变体结果:
${test.results.variantStats.map(s => `
${s.variantName}:
- 发送: ${s.sent}
- 打开: ${s.opened} (${s.sent > 0 ? (s.opened/s.sent*100).toFixed(1) : 0}%)
- 回复: ${s.replied} (${s.sent > 0 ? (s.replied/s.sent*100).toFixed(1) : 0}%)
- 平均情感: ${s.avgSentiment.toFixed(2)}
`).join('\n')}

获胜者: ${test.results.winner?.variantName || '无'}

请提供 3-5 条具体的优化建议，每条一行`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'moderate',
      });

      return response.replies[0].content.split('\n').filter(line => line.trim());
    } catch {
      return ['无法生成优化建议'];
    }
  }
}

export const abTestingService = new ABTestingService();
