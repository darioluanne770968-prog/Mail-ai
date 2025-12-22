/**
 * AI Writing Coach Service
 * Help users improve their email writing skills over time
 */

import { AIService } from '../ai/index.js';

export interface WritingAnalysis {
  id: string;
  emailId: string;
  timestamp: Date;
  scores: {
    clarity: number;      // 0-100
    conciseness: number;
    professionalism: number;
    grammar: number;
    tone: number;
    structure: number;
    overall: number;
  };
  issues: Array<{
    type: 'grammar' | 'spelling' | 'style' | 'structure' | 'tone' | 'clarity';
    severity: 'minor' | 'moderate' | 'major';
    location: string;
    original: string;
    suggestion: string;
    explanation: string;
  }>;
  strengths: string[];
  improvements: string[];
}

export interface WritingSkillLevel {
  userId: string;
  currentLevel: number; // 1-10
  xp: number;
  nextLevelXp: number;
  badges: Badge[];
  skills: {
    clarity: SkillProgress;
    conciseness: SkillProgress;
    professionalism: SkillProgress;
    grammar: SkillProgress;
    tone: SkillProgress;
    structure: SkillProgress;
  };
  streak: {
    current: number;
    longest: number;
    lastActivity: Date;
  };
}

export interface SkillProgress {
  level: number;
  progress: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  recentScores: number[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface WritingTip {
  id: string;
  category: string;
  tip: string;
  example?: {
    before: string;
    after: string;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface WritingChallenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  goal: {
    metric: string;
    target: number;
    current: number;
  };
  reward: {
    xp: number;
    badge?: Badge;
  };
  expiresAt: Date;
  completed: boolean;
}

export interface PersonalizedLesson {
  id: string;
  userId: string;
  topic: string;
  content: string;
  examples: Array<{
    context: string;
    bad: string;
    good: string;
    explanation: string;
  }>;
  exercises: Array<{
    prompt: string;
    hints: string[];
  }>;
  basedOn: string[]; // Analysis IDs that led to this lesson
}

// In-memory storage
const writingAnalyses = new Map<string, WritingAnalysis[]>();
const skillLevels = new Map<string, WritingSkillLevel>();
const challenges = new Map<string, WritingChallenge[]>();

export class WritingCoachService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Analyze email writing quality
   */
  async analyzeWriting(
    userId: string,
    emailId: string,
    content: string,
    context?: { isReply: boolean; recipient?: string; purpose?: string }
  ): Promise<WritingAnalysis> {
    const prompt = `作为专业的写作教练，分析以下邮件的写作质量：

${context?.isReply ? '这是一封回复邮件' : '这是一封新邮件'}
${context?.recipient ? `收件人：${context.recipient}` : ''}
${context?.purpose ? `目的：${context.purpose}` : ''}

邮件内容：
${content}

请从以下维度评分（0-100）并提供详细反馈：
1. 清晰度 (clarity) - 信息是否清晰易懂
2. 简洁度 (conciseness) - 是否简明扼要
3. 专业性 (professionalism) - 语言是否专业得体
4. 语法 (grammar) - 语法是否正确
5. 语气 (tone) - 语气是否恰当
6. 结构 (structure) - 结构是否合理

返回 JSON：
{
  "scores": {
    "clarity": 85,
    "conciseness": 70,
    "professionalism": 90,
    "grammar": 95,
    "tone": 80,
    "structure": 75,
    "overall": 82
  },
  "issues": [
    {
      "type": "style",
      "severity": "moderate",
      "location": "第二段",
      "original": "原文",
      "suggestion": "建议修改",
      "explanation": "解释原因"
    }
  ],
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进建议1", "改进建议2"]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const result = JSON.parse(response.replies[0].content);

      const analysis: WritingAnalysis = {
        id: `analysis_${Date.now()}`,
        emailId,
        timestamp: new Date(),
        scores: result.scores,
        issues: result.issues || [],
        strengths: result.strengths || [],
        improvements: result.improvements || [],
      };

      // Store analysis
      let userAnalyses = writingAnalyses.get(userId);
      if (!userAnalyses) {
        userAnalyses = [];
        writingAnalyses.set(userId, userAnalyses);
      }
      userAnalyses.push(analysis);

      // Update skill levels
      this.updateSkillLevels(userId, analysis);

      // Check for challenges
      await this.checkChallenges(userId, analysis);

      return analysis;
    } catch {
      return {
        id: `analysis_${Date.now()}`,
        emailId,
        timestamp: new Date(),
        scores: {
          clarity: 70,
          conciseness: 70,
          professionalism: 70,
          grammar: 70,
          tone: 70,
          structure: 70,
          overall: 70,
        },
        issues: [],
        strengths: ['无法完成详细分析'],
        improvements: ['请稍后重试'],
      };
    }
  }

  /**
   * Update skill levels based on analysis
   */
  private updateSkillLevels(userId: string, analysis: WritingAnalysis): void {
    let level = skillLevels.get(userId);

    if (!level) {
      level = this.initializeSkillLevel(userId);
    }

    // Update each skill
    const skills = ['clarity', 'conciseness', 'professionalism', 'grammar', 'tone', 'structure'] as const;

    skills.forEach(skill => {
      const score = analysis.scores[skill];
      const skillProgress = level!.skills[skill];

      skillProgress.recentScores.push(score);
      if (skillProgress.recentScores.length > 10) {
        skillProgress.recentScores.shift();
      }

      // Calculate trend
      const avgRecent = skillProgress.recentScores.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const avgOlder = skillProgress.recentScores.slice(0, 5).reduce((a, b) => a + b, 0) / 5;

      if (avgRecent > avgOlder + 5) {
        skillProgress.trend = 'improving';
      } else if (avgRecent < avgOlder - 5) {
        skillProgress.trend = 'declining';
      } else {
        skillProgress.trend = 'stable';
      }

      // Update progress
      skillProgress.progress = Math.min(100, (avgRecent / 100) * 100);

      // Level up skill
      if (skillProgress.progress >= 100) {
        skillProgress.level++;
        skillProgress.progress = 0;
      }
    });

    // Add XP
    const xpGained = Math.round(analysis.scores.overall / 10);
    level.xp += xpGained;

    // Level up user
    while (level.xp >= level.nextLevelXp) {
      level.xp -= level.nextLevelXp;
      level.currentLevel++;
      level.nextLevelXp = Math.round(level.nextLevelXp * 1.5);

      // Award badge for level up
      if (level.currentLevel % 5 === 0) {
        level.badges.push({
          id: `badge_level_${level.currentLevel}`,
          name: `写作达人 Lv.${level.currentLevel}`,
          description: `达到写作等级 ${level.currentLevel}`,
          icon: '🏆',
          earnedAt: new Date(),
          rarity: level.currentLevel >= 20 ? 'legendary' : level.currentLevel >= 10 ? 'epic' : 'rare',
        });
      }
    }

    // Update streak
    const lastActivity = level.streak.lastActivity;
    const today = new Date();
    const dayDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      level.streak.current++;
      level.streak.longest = Math.max(level.streak.longest, level.streak.current);
    } else if (dayDiff > 1) {
      level.streak.current = 1;
    }
    level.streak.lastActivity = today;

    skillLevels.set(userId, level);
  }

  /**
   * Initialize skill level for new user
   */
  private initializeSkillLevel(userId: string): WritingSkillLevel {
    const initialSkill: SkillProgress = {
      level: 1,
      progress: 0,
      trend: 'stable',
      recentScores: [],
    };

    return {
      userId,
      currentLevel: 1,
      xp: 0,
      nextLevelXp: 100,
      badges: [{
        id: 'badge_starter',
        name: '写作新手',
        description: '开始你的写作提升之旅',
        icon: '✍️',
        earnedAt: new Date(),
        rarity: 'common',
      }],
      skills: {
        clarity: { ...initialSkill },
        conciseness: { ...initialSkill },
        professionalism: { ...initialSkill },
        grammar: { ...initialSkill },
        tone: { ...initialSkill },
        structure: { ...initialSkill },
      },
      streak: {
        current: 1,
        longest: 1,
        lastActivity: new Date(),
      },
    };
  }

  /**
   * Get user's skill level
   */
  getSkillLevel(userId: string): WritingSkillLevel {
    let level = skillLevels.get(userId);
    if (!level) {
      level = this.initializeSkillLevel(userId);
      skillLevels.set(userId, level);
    }
    return level;
  }

  /**
   * Generate personalized writing tips
   */
  async getPersonalizedTips(userId: string): Promise<WritingTip[]> {
    const level = this.getSkillLevel(userId);
    const analyses = writingAnalyses.get(userId) || [];
    const recentAnalyses = analyses.slice(-5);

    // Find weakest skills
    const skillScores = Object.entries(level.skills)
      .map(([skill, progress]) => ({
        skill,
        avgScore: progress.recentScores.length > 0
          ? progress.recentScores.reduce((a, b) => a + b, 0) / progress.recentScores.length
          : 50,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const weakestSkills = skillScores.slice(0, 2).map(s => s.skill);

    const tips: WritingTip[] = [];

    // Generate tips based on weak areas
    const tipTemplates: Record<string, WritingTip[]> = {
      clarity: [
        {
          id: 'tip_clarity_1',
          category: 'clarity',
          tip: '使用简单直接的句子结构，避免嵌套从句',
          example: {
            before: '关于你之前提到的那个我们讨论过的项目的事情，我想说...',
            after: '关于XX项目，我有以下建议：',
          },
          difficulty: 'beginner',
        },
        {
          id: 'tip_clarity_2',
          category: 'clarity',
          tip: '每个段落只讨论一个主题',
          difficulty: 'intermediate',
        },
      ],
      conciseness: [
        {
          id: 'tip_concise_1',
          category: 'conciseness',
          tip: '删除冗余词语，如"非常"、"真的"、"其实"',
          example: {
            before: '我其实真的非常希望能够尽快完成这个工作',
            after: '我希望尽快完成这项工作',
          },
          difficulty: 'beginner',
        },
      ],
      professionalism: [
        {
          id: 'tip_prof_1',
          category: 'professionalism',
          tip: '使用正式的问候语和结束语',
          example: {
            before: 'Hi，事情是这样的...',
            after: '您好，感谢您的邮件。关于...',
          },
          difficulty: 'beginner',
        },
      ],
      tone: [
        {
          id: 'tip_tone_1',
          category: 'tone',
          tip: '避免使用感叹号，它们可能显得不够专业或过于情绪化',
          difficulty: 'intermediate',
        },
      ],
      grammar: [
        {
          id: 'tip_grammar_1',
          category: 'grammar',
          tip: '检查主谓一致性，确保动词与主语匹配',
          difficulty: 'beginner',
        },
      ],
      structure: [
        {
          id: 'tip_structure_1',
          category: 'structure',
          tip: '使用"金字塔原则"：先说结论，再说原因',
          example: {
            before: '经过多方考虑，分析了各种因素后，我觉得...所以建议采用A方案',
            after: '建议采用A方案。原因如下：1... 2...',
          },
          difficulty: 'intermediate',
        },
      ],
    };

    weakestSkills.forEach(skill => {
      const skillTips = tipTemplates[skill] || [];
      tips.push(...skillTips);
    });

    return tips.slice(0, 5);
  }

  /**
   * Generate personalized lesson
   */
  async generateLesson(userId: string): Promise<PersonalizedLesson> {
    const level = this.getSkillLevel(userId);
    const analyses = writingAnalyses.get(userId) || [];

    // Find recurring issues
    const allIssues = analyses.flatMap(a => a.issues);
    const issueTypes = allIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIssue = Object.entries(issueTypes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'clarity';

    const prompt = `为一个邮件写作学习者创建一个简短的课程，重点改进"${topIssue}"方面。

用户当前水平：${level.currentLevel} 级
常见问题：${allIssues.slice(-5).map(i => i.original).join('; ')}

返回 JSON：
{
  "topic": "课程主题",
  "content": "课程内容（2-3段）",
  "examples": [
    {
      "context": "场景描述",
      "bad": "错误示例",
      "good": "正确示例",
      "explanation": "解释"
    }
  ],
  "exercises": [
    {
      "prompt": "练习题目",
      "hints": ["提示1", "提示2"]
    }
  ]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });

      const result = JSON.parse(response.replies[0].content);

      return {
        id: `lesson_${Date.now()}`,
        userId,
        topic: result.topic,
        content: result.content,
        examples: result.examples || [],
        exercises: result.exercises || [],
        basedOn: analyses.slice(-5).map(a => a.id),
      };
    } catch {
      return {
        id: `lesson_${Date.now()}`,
        userId,
        topic: '提高邮件写作清晰度',
        content: '清晰的写作是有效沟通的基础...',
        examples: [],
        exercises: [],
        basedOn: [],
      };
    }
  }

  /**
   * Check and update challenges
   */
  private async checkChallenges(userId: string, analysis: WritingAnalysis): Promise<void> {
    let userChallenges = challenges.get(userId);
    if (!userChallenges) {
      userChallenges = this.generateChallenges(userId);
      challenges.set(userId, userChallenges);
    }

    for (const challenge of userChallenges) {
      if (challenge.completed) continue;

      // Update progress based on analysis
      if (challenge.goal.metric === 'emails_analyzed') {
        challenge.goal.current++;
      } else if (challenge.goal.metric === 'avg_score' && analysis.scores.overall >= challenge.goal.target) {
        challenge.goal.current++;
      }

      // Check completion
      if (challenge.goal.current >= challenge.goal.target) {
        challenge.completed = true;
        const level = skillLevels.get(userId);
        if (level) {
          level.xp += challenge.reward.xp;
          if (challenge.reward.badge) {
            level.badges.push(challenge.reward.badge);
          }
        }
      }
    }
  }

  /**
   * Generate challenges for user
   */
  private generateChallenges(userId: string): WritingChallenge[] {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return [
      {
        id: `challenge_daily_${Date.now()}`,
        title: '每日写作练习',
        description: '今天分析3封邮件',
        type: 'daily',
        goal: { metric: 'emails_analyzed', target: 3, current: 0 },
        reward: { xp: 50 },
        expiresAt: tomorrow,
        completed: false,
      },
      {
        id: `challenge_weekly_${Date.now()}`,
        title: '高质量写作周',
        description: '本周写5封评分80分以上的邮件',
        type: 'weekly',
        goal: { metric: 'avg_score', target: 5, current: 0 },
        reward: {
          xp: 200,
          badge: {
            id: 'badge_quality',
            name: '质量之星',
            description: '连续写出高质量邮件',
            icon: '⭐',
            earnedAt: new Date(),
            rarity: 'rare',
          },
        },
        expiresAt: nextWeek,
        completed: false,
      },
    ];
  }

  /**
   * Get user's challenges
   */
  getChallenges(userId: string): WritingChallenge[] {
    let userChallenges = challenges.get(userId);
    if (!userChallenges) {
      userChallenges = this.generateChallenges(userId);
      challenges.set(userId, userChallenges);
    }
    return userChallenges;
  }

  /**
   * Get writing history
   */
  getWritingHistory(userId: string): WritingAnalysis[] {
    return writingAnalyses.get(userId) || [];
  }
}

export const writingCoachService = new WritingCoachService();
