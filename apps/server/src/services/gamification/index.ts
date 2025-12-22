/**
 * Email Gamification Service
 * Productivity streaks, achievements, leaderboards
 */

export interface UserGameProfile {
  userId: string;
  displayName: string;
  avatar?: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXp: number;
  rank: string;
  streaks: {
    inboxZero: StreakData;
    dailyProcessing: StreakData;
    quickResponse: StreakData;
  };
  achievements: Achievement[];
  stats: GameStats;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface StreakData {
  current: number;
  longest: number;
  lastUpdated: Date;
  milestones: number[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'productivity' | 'quality' | 'consistency' | 'social' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress?: {
    current: number;
    target: number;
  };
  xpReward: number;
  secret?: boolean;
}

export interface GameStats {
  emailsProcessed: number;
  emailsSent: number;
  inboxZeroCount: number;
  avgResponseTime: number;
  perfectDays: number;
  longestStreak: number;
  totalTimesSaved: number; // minutes
  aiSuggestionsUsed: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar?: string;
  level: number;
  score: number;
  change: number; // position change from last period
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'process' | 'respond' | 'organize' | 'special';
  goal: number;
  current: number;
  xpReward: number;
  bonusXp?: number;
  expiresAt: Date;
  completed: boolean;
}

export interface WeeklyQuest {
  id: string;
  title: string;
  description: string;
  tasks: Array<{
    description: string;
    completed: boolean;
    current: number;
    target: number;
  }>;
  rewards: {
    xp: number;
    achievement?: string;
  };
  startsAt: Date;
  endsAt: Date;
  completed: boolean;
}

// Achievement definitions
const ACHIEVEMENTS: Achievement[] = [
  // Productivity
  { id: 'first_inbox_zero', name: 'Inbox Zero', description: '首次达到收件箱清零', icon: '📭', category: 'productivity', rarity: 'common', xpReward: 50 },
  { id: 'inbox_zero_week', name: '清零周', description: '连续7天保持 Inbox Zero', icon: '🗂️', category: 'productivity', rarity: 'rare', xpReward: 200 },
  { id: 'inbox_zero_month', name: '清零月', description: '连续30天保持 Inbox Zero', icon: '🏆', category: 'productivity', rarity: 'legendary', xpReward: 1000 },
  { id: 'speed_demon', name: '闪电回复', description: '5分钟内回复10封邮件', icon: '⚡', category: 'productivity', rarity: 'uncommon', xpReward: 100 },
  { id: 'marathon', name: '邮件马拉松', description: '一天处理100封邮件', icon: '🏃', category: 'productivity', rarity: 'rare', xpReward: 300 },

  // Quality
  { id: 'wordsmith', name: '文字匠人', description: '写作评分连续10次超过90分', icon: '✍️', category: 'quality', rarity: 'rare', xpReward: 250 },
  { id: 'diplomat', name: '邮件外交官', description: '成功处理5个潜在冲突邮件', icon: '🕊️', category: 'quality', rarity: 'epic', xpReward: 400 },
  { id: 'ai_master', name: 'AI 大师', description: '使用AI建议100次', icon: '🤖', category: 'quality', rarity: 'uncommon', xpReward: 150 },

  // Consistency
  { id: 'early_bird', name: '早起鸟', description: '连续5天在9点前处理完邮件', icon: '🐦', category: 'consistency', rarity: 'uncommon', xpReward: 100 },
  { id: 'night_owl', name: '夜猫子', description: '凌晨处理邮件（不推荐！）', icon: '🦉', category: 'consistency', rarity: 'common', xpReward: 20, secret: true },
  { id: 'streak_7', name: '周连击', description: '连续7天处理邮件', icon: '🔥', category: 'consistency', rarity: 'common', xpReward: 70 },
  { id: 'streak_30', name: '月连击', description: '连续30天处理邮件', icon: '💫', category: 'consistency', rarity: 'rare', xpReward: 300 },
  { id: 'streak_100', name: '百日连击', description: '连续100天处理邮件', icon: '👑', category: 'consistency', rarity: 'legendary', xpReward: 1000 },

  // Social
  { id: 'team_player', name: '团队协作者', description: '帮助5位同事处理邮件', icon: '🤝', category: 'social', rarity: 'uncommon', xpReward: 100 },
  { id: 'mentor', name: '导师', description: '分享10个写作技巧', icon: '📚', category: 'social', rarity: 'rare', xpReward: 200 },

  // Special
  { id: 'zen_master', name: '禅意大师', description: '工作日不发送任何非必要邮件', icon: '🧘', category: 'special', rarity: 'epic', xpReward: 500, secret: true },
  { id: 'comeback', name: '王者归来', description: '一次性处理积压的50封邮件', icon: '💪', category: 'special', rarity: 'rare', xpReward: 250 },
];

// Rank thresholds
const RANKS = [
  { level: 1, name: '邮件新手', icon: '🌱' },
  { level: 5, name: '邮件学徒', icon: '📧' },
  { level: 10, name: '邮件能手', icon: '📬' },
  { level: 20, name: '邮件专家', icon: '📮' },
  { level: 35, name: '邮件大师', icon: '🎯' },
  { level: 50, name: '邮件传奇', icon: '👑' },
  { level: 75, name: '邮件神话', icon: '🏆' },
  { level: 100, name: '邮件之神', icon: '⚡' },
];

// In-memory storage
const profiles = new Map<string, UserGameProfile>();
const dailyChallenges = new Map<string, DailyChallenge[]>();
const weeklyQuests = new Map<string, WeeklyQuest>();

export class GamificationService {

  /**
   * Get or create user profile
   */
  getProfile(userId: string, displayName?: string): UserGameProfile {
    let profile = profiles.get(userId);

    if (!profile) {
      profile = this.createProfile(userId, displayName || userId);
      profiles.set(userId, profile);
    }

    return profile;
  }

  /**
   * Create new user profile
   */
  private createProfile(userId: string, displayName: string): UserGameProfile {
    return {
      userId,
      displayName,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      totalXp: 0,
      rank: '邮件新手',
      streaks: {
        inboxZero: { current: 0, longest: 0, lastUpdated: new Date(), milestones: [] },
        dailyProcessing: { current: 0, longest: 0, lastUpdated: new Date(), milestones: [] },
        quickResponse: { current: 0, longest: 0, lastUpdated: new Date(), milestones: [] },
      },
      achievements: ACHIEVEMENTS.map(a => ({
        ...a,
        unlockedAt: undefined,
        progress: a.progress || { current: 0, target: 1 },
      })),
      stats: {
        emailsProcessed: 0,
        emailsSent: 0,
        inboxZeroCount: 0,
        avgResponseTime: 0,
        perfectDays: 0,
        longestStreak: 0,
        totalTimesSaved: 0,
        aiSuggestionsUsed: 0,
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
  }

  /**
   * Add XP to user
   */
  addXp(userId: string, amount: number, reason: string): {
    newXp: number;
    levelUp: boolean;
    newLevel?: number;
    newRank?: string;
  } {
    const profile = this.getProfile(userId);

    profile.xp += amount;
    profile.totalXp += amount;

    let levelUp = false;
    let newRank: string | undefined;

    // Check for level up
    while (profile.xp >= profile.xpToNextLevel) {
      profile.xp -= profile.xpToNextLevel;
      profile.level++;
      profile.xpToNextLevel = Math.round(profile.xpToNextLevel * 1.2);
      levelUp = true;

      // Check for new rank
      const rank = RANKS.filter(r => r.level <= profile.level).pop();
      if (rank && rank.name !== profile.rank) {
        profile.rank = rank.name;
        newRank = rank.name;
      }
    }

    return {
      newXp: profile.xp,
      levelUp,
      newLevel: levelUp ? profile.level : undefined,
      newRank,
    };
  }

  /**
   * Record email activity
   */
  recordActivity(
    userId: string,
    activity: {
      type: 'processed' | 'sent' | 'inbox_zero' | 'quick_response' | 'ai_used';
      count?: number;
      responseTime?: number;
    }
  ): { xpGained: number; achievements: Achievement[] } {
    const profile = this.getProfile(userId);
    profile.lastActiveAt = new Date();

    let xpGained = 0;
    const unlockedAchievements: Achievement[] = [];

    switch (activity.type) {
      case 'processed':
        profile.stats.emailsProcessed += activity.count || 1;
        xpGained = (activity.count || 1) * 5;
        break;

      case 'sent':
        profile.stats.emailsSent += activity.count || 1;
        xpGained = (activity.count || 1) * 3;
        break;

      case 'inbox_zero':
        profile.stats.inboxZeroCount++;
        this.updateStreak(profile.streaks.inboxZero);
        xpGained = 20;

        // Check achievements
        if (profile.stats.inboxZeroCount === 1) {
          const achievement = this.unlockAchievement(userId, 'first_inbox_zero');
          if (achievement) unlockedAchievements.push(achievement);
        }
        if (profile.streaks.inboxZero.current === 7) {
          const achievement = this.unlockAchievement(userId, 'inbox_zero_week');
          if (achievement) unlockedAchievements.push(achievement);
        }
        break;

      case 'quick_response':
        if (activity.responseTime && activity.responseTime < 5) {
          this.updateStreak(profile.streaks.quickResponse);
          xpGained = 10;
        }
        break;

      case 'ai_used':
        profile.stats.aiSuggestionsUsed += activity.count || 1;
        xpGained = 2;

        if (profile.stats.aiSuggestionsUsed === 100) {
          const achievement = this.unlockAchievement(userId, 'ai_master');
          if (achievement) unlockedAchievements.push(achievement);
        }
        break;
    }

    // Update daily processing streak
    this.updateStreak(profile.streaks.dailyProcessing);

    // Check streak achievements
    if (profile.streaks.dailyProcessing.current === 7) {
      const achievement = this.unlockAchievement(userId, 'streak_7');
      if (achievement) unlockedAchievements.push(achievement);
    }
    if (profile.streaks.dailyProcessing.current === 30) {
      const achievement = this.unlockAchievement(userId, 'streak_30');
      if (achievement) unlockedAchievements.push(achievement);
    }

    // Add XP
    if (xpGained > 0) {
      this.addXp(userId, xpGained, activity.type);
    }

    // Update daily challenges
    this.updateDailyChallenges(userId, activity.type, activity.count || 1);

    return { xpGained, achievements: unlockedAchievements };
  }

  /**
   * Update streak data
   */
  private updateStreak(streak: StreakData): void {
    const now = new Date();
    const lastUpdate = new Date(streak.lastUpdated);

    // Check if same day
    const isSameDay = now.toDateString() === lastUpdate.toDateString();

    // Check if consecutive day
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = lastUpdate.toDateString() === yesterday.toDateString();

    if (isSameDay) {
      // Already updated today
      return;
    } else if (isConsecutive) {
      // Continue streak
      streak.current++;
      streak.longest = Math.max(streak.longest, streak.current);

      // Track milestones
      if ([7, 14, 30, 60, 100].includes(streak.current)) {
        streak.milestones.push(streak.current);
      }
    } else {
      // Break streak
      streak.current = 1;
    }

    streak.lastUpdated = now;
  }

  /**
   * Unlock an achievement
   */
  unlockAchievement(userId: string, achievementId: string): Achievement | null {
    const profile = this.getProfile(userId);
    const achievement = profile.achievements.find(a => a.id === achievementId);

    if (!achievement || achievement.unlockedAt) {
      return null;
    }

    achievement.unlockedAt = new Date();
    this.addXp(userId, achievement.xpReward, `Achievement: ${achievement.name}`);

    return achievement;
  }

  /**
   * Get daily challenges
   */
  getDailyChallenges(userId: string): DailyChallenge[] {
    let challenges = dailyChallenges.get(userId);
    const now = new Date();

    // Check if challenges are expired
    if (challenges && challenges[0]?.expiresAt < now) {
      challenges = undefined;
    }

    if (!challenges) {
      challenges = this.generateDailyChallenges();
      dailyChallenges.set(userId, challenges);
    }

    return challenges;
  }

  /**
   * Generate daily challenges
   */
  private generateDailyChallenges(): DailyChallenge[] {
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    return [
      {
        id: `dc_${Date.now()}_1`,
        title: '邮件处理达人',
        description: '今天处理20封邮件',
        icon: '📬',
        type: 'process',
        goal: 20,
        current: 0,
        xpReward: 50,
        expiresAt: tomorrow,
        completed: false,
      },
      {
        id: `dc_${Date.now()}_2`,
        title: '快速响应者',
        description: '5封邮件在10分钟内回复',
        icon: '⚡',
        type: 'respond',
        goal: 5,
        current: 0,
        xpReward: 75,
        bonusXp: 25,
        expiresAt: tomorrow,
        completed: false,
      },
      {
        id: `dc_${Date.now()}_3`,
        title: '收件箱整理',
        description: '归档或删除10封旧邮件',
        icon: '🗂️',
        type: 'organize',
        goal: 10,
        current: 0,
        xpReward: 30,
        expiresAt: tomorrow,
        completed: false,
      },
    ];
  }

  /**
   * Update daily challenges progress
   */
  private updateDailyChallenges(userId: string, activityType: string, count: number): void {
    const challenges = this.getDailyChallenges(userId);

    for (const challenge of challenges) {
      if (challenge.completed) continue;

      if (
        (challenge.type === 'process' && activityType === 'processed') ||
        (challenge.type === 'respond' && activityType === 'quick_response') ||
        (challenge.type === 'organize' && activityType === 'processed')
      ) {
        challenge.current += count;

        if (challenge.current >= challenge.goal) {
          challenge.completed = true;
          this.addXp(userId, challenge.xpReward + (challenge.bonusXp || 0), `Challenge: ${challenge.title}`);
        }
      }
    }
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(
    type: 'xp' | 'streak' | 'productivity',
    limit: number = 10
  ): LeaderboardEntry[] {
    const allProfiles = Array.from(profiles.values());

    let sorted: UserGameProfile[];

    switch (type) {
      case 'xp':
        sorted = allProfiles.sort((a, b) => b.totalXp - a.totalXp);
        break;
      case 'streak':
        sorted = allProfiles.sort((a, b) =>
          b.streaks.dailyProcessing.current - a.streaks.dailyProcessing.current
        );
        break;
      case 'productivity':
        sorted = allProfiles.sort((a, b) => b.stats.emailsProcessed - a.stats.emailsProcessed);
        break;
    }

    return sorted.slice(0, limit).map((profile, index) => ({
      rank: index + 1,
      userId: profile.userId,
      displayName: profile.displayName,
      avatar: profile.avatar,
      level: profile.level,
      score: type === 'xp' ? profile.totalXp :
             type === 'streak' ? profile.streaks.dailyProcessing.current :
             profile.stats.emailsProcessed,
      change: 0, // Would track historical data
    }));
  }

  /**
   * Get user's unlocked achievements
   */
  getUnlockedAchievements(userId: string): Achievement[] {
    const profile = this.getProfile(userId);
    return profile.achievements.filter(a => a.unlockedAt);
  }

  /**
   * Get available achievements (not yet unlocked)
   */
  getAvailableAchievements(userId: string): Achievement[] {
    const profile = this.getProfile(userId);
    return profile.achievements.filter(a => !a.unlockedAt && !a.secret);
  }

  /**
   * Update display name
   */
  updateDisplayName(userId: string, displayName: string): void {
    const profile = this.getProfile(userId);
    profile.displayName = displayName;
  }
}

export const gamificationService = new GamificationService();
