import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Star, Target, Users, Crown, Zap, Gift } from 'lucide-react';

interface GameProfile {
  id: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rank: string;
  streaks: {
    current: number;
    longest: number;
    type: string;
  };
  achievements: string[];
  stats: {
    emailsSent: number;
    emailsRead: number;
    avgResponseTime: number;
    inboxZeroCount: number;
  };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlockedAt?: Date;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  expiresAt: Date;
}

interface GamificationPanelProps {
  userId?: string;
}

export function GamificationPanel({ userId = 'default' }: GamificationPanelProps) {
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'challenges' | 'achievements' | 'leaderboard'>('profile');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profileRes, challengesRes, achievementsRes, leaderboardRes] = await Promise.all([
        fetch(`/api/v1/ultra/game/profile/${userId}`),
        fetch(`/api/v1/ultra/game/challenges/daily/${userId}`),
        fetch('/api/v1/ultra/game/achievements'),
        fetch('/api/v1/ultra/game/leaderboard?type=weekly&limit=10'),
      ]);

      const profileData = await profileRes.json();
      const challengesData = await challengesRes.json();
      const achievementsData = await achievementsRes.json();
      const leaderboardData = await leaderboardRes.json();

      setProfile(profileData);
      setChallenges(challengesData.challenges || []);
      setAchievements(achievementsData.achievements || []);
      setLeaderboard(leaderboardData.leaderboard || []);
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      '邮件新手': 'from-gray-400 to-gray-500',
      '邮件学徒': 'from-green-400 to-emerald-500',
      '邮件专员': 'from-blue-400 to-cyan-500',
      '邮件达人': 'from-purple-400 to-violet-500',
      '邮件专家': 'from-pink-400 to-rose-500',
      '邮件大师': 'from-orange-400 to-amber-500',
      '邮件宗师': 'from-red-400 to-rose-500',
      '邮件之神': 'from-yellow-400 to-amber-500',
    };
    return colors[rank] || 'from-gray-400 to-gray-500';
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'bg-gray-100 text-gray-600',
      uncommon: 'bg-green-100 text-green-600',
      rare: 'bg-blue-100 text-blue-600',
      epic: 'bg-purple-100 text-purple-600',
      legendary: 'bg-yellow-100 text-yellow-600',
    };
    return colors[rarity] || 'bg-gray-100 text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-500" size={20} />
          <h3 className="font-semibold">邮件游戏</h3>
        </div>
        {profile && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame size={16} />
            <span className="text-sm font-medium">{profile.streaks?.current || 0}天</span>
          </div>
        )}
      </div>

      {/* Level & XP */}
      {profile && (
        <div className={`p-4 rounded-xl bg-gradient-to-r ${getRankColor(profile.rank)} text-white`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs opacity-80">等级 {profile.level}</p>
              <p className="text-lg font-bold">{profile.rank}</p>
            </div>
            <Crown size={32} className="opacity-80" />
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span>{profile.xp} XP</span>
              <span>{profile.xpToNextLevel} XP</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${(profile.xp / profile.xpToNextLevel) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'profile', label: '统计', icon: Star },
          { id: 'challenges', label: '挑战', icon: Target },
          { id: 'achievements', label: '成就', icon: Trophy },
          { id: 'leaderboard', label: '排行', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && profile && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{profile.stats.emailsSent}</p>
            <p className="text-xs text-gray-500">发送邮件</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{profile.stats.emailsRead}</p>
            <p className="text-xs text-gray-500">阅读邮件</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-600">{profile.stats.inboxZeroCount}</p>
            <p className="text-xs text-gray-500">收件箱清零</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600">{profile.streaks.longest}</p>
            <p className="text-xs text-gray-500">最长连续</p>
          </div>
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div className="space-y-2">
          {challenges.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">今日挑战已完成!</p>
          ) : (
            challenges.map((challenge) => (
              <div key={challenge.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium">{challenge.title}</p>
                    <p className="text-xs text-gray-500">{challenge.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Zap size={12} />
                    <span className="text-xs font-medium">+{challenge.xpReward}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{challenge.progress}/{challenge.target}</span>
                    <span>{Math.round((challenge.progress / challenge.target) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                      style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-2 rounded-lg text-center ${
                achievement.unlockedAt ? getRarityColor(achievement.rarity) : 'bg-gray-100 opacity-50'
              }`}
              title={achievement.description}
            >
              <span className="text-2xl">{achievement.icon}</span>
              <p className="text-xs mt-1 truncate">{achievement.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                index < 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50' : 'bg-gray-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-400 text-white' :
                index === 1 ? 'bg-gray-300 text-white' :
                index === 2 ? 'bg-amber-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{entry.name}</p>
                <p className="text-xs text-gray-500">Lv.{entry.level}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-yellow-600">{entry.xp}</p>
                <p className="text-xs text-gray-500">XP</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
