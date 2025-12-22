import React, { useState, useEffect } from 'react';
import { PenTool, Award, BookOpen, Target, TrendingUp, Star } from 'lucide-react';

interface SkillLevel {
  skill: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  recentProgress: number;
}

interface WritingAnalysis {
  overallScore: number;
  skillScores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}

interface WritingCoachProps {
  userId?: string;
  emailContent?: string;
  onAnalysisComplete?: (analysis: WritingAnalysis) => void;
}

export function WritingCoach({ userId = 'default', emailContent, onAnalysisComplete }: WritingCoachProps) {
  const [skills, setSkills] = useState<SkillLevel[]>([]);
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'skills' | 'analysis' | 'tips'>('skills');

  useEffect(() => {
    loadSkills();
    loadTips();
    loadBadges();
  }, [userId]);

  useEffect(() => {
    if (emailContent && emailContent.length > 50) {
      analyzeWriting();
    }
  }, [emailContent]);

  const loadSkills = async () => {
    try {
      const response = await fetch(`/api/v1/ultra/coach/skills/${userId}`);
      const data = await response.json();
      setSkills(data || []);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  const loadTips = async () => {
    try {
      const response = await fetch(`/api/v1/ultra/coach/tips/${userId}`);
      const data = await response.json();
      setTips(data.tips?.map((t: any) => t.content) || []);
    } catch (error) {
      console.error('Failed to load tips:', error);
    }
  };

  const loadBadges = async () => {
    try {
      const response = await fetch(`/api/v1/ultra/coach/badges/${userId}`);
      const data = await response.json();
      setBadges(data.badges || []);
    } catch (error) {
      console.error('Failed to load badges:', error);
    }
  };

  const analyzeWriting = async () => {
    if (!emailContent) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/v1/ultra/coach/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          emailContent,
          context: { type: 'compose' },
        }),
      });
      const data = await response.json();
      setAnalysis(data);
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    } catch (error) {
      console.error('Failed to analyze writing:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSkillColor = (level: number) => {
    if (level >= 8) return 'from-yellow-400 to-amber-500';
    if (level >= 6) return 'from-purple-400 to-violet-500';
    if (level >= 4) return 'from-blue-400 to-cyan-500';
    return 'from-green-400 to-emerald-500';
  };

  const getSkillLabel = (skill: string) => {
    const labels: Record<string, string> = {
      clarity: '清晰度',
      conciseness: '简洁性',
      professionalism: '专业性',
      grammar: '语法',
      tone: '语气',
      structure: '结构',
    };
    return labels[skill] || skill;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PenTool className="text-purple-500" size={20} />
          <h3 className="font-semibold">AI写作教练</h3>
        </div>
        {badges.length > 0 && (
          <div className="flex -space-x-1">
            {badges.slice(0, 3).map((badge, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-xs"
                title={badge.name}
              >
                {badge.icon || '🏆'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'skills', label: '技能等级', icon: TrendingUp },
          { id: 'analysis', label: '写作分析', icon: Target },
          { id: 'tips', label: '提升技巧', icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-3">
          {skills.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              继续写邮件来提升您的技能等级
            </p>
          ) : (
            skills.map((skill) => (
              <div key={skill.skill} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{getSkillLabel(skill.skill)}</span>
                  <span className="text-gray-500">Lv.{skill.level}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getSkillColor(skill.level)} rounded-full transition-all`}
                    style={{ width: `${(skill.xp / skill.nextLevelXp) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{skill.xp} XP</span>
                  <span>下一级: {skill.nextLevelXp} XP</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          {isAnalyzing ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-500">分析中...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Overall Score */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-violet-100">
                  <span className="text-2xl font-bold text-purple-600">{analysis.overallScore}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">综合评分</p>
              </div>

              {/* Skill Scores */}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(analysis.skillScores || {}).map(([skill, score]) => (
                  <div key={skill} className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-semibold">{score}</p>
                    <p className="text-xs text-gray-500">{getSkillLabel(skill)}</p>
                  </div>
                ))}
              </div>

              {/* Strengths & Improvements */}
              {analysis.strengths?.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-700 mb-1">💪 优点</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {analysis.strengths.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.improvements?.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm font-medium text-amber-700 mb-1">🎯 可改进</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {analysis.improvements.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">输入邮件内容后自动分析</p>
            </div>
          )}
        </div>
      )}

      {/* Tips Tab */}
      {activeTab === 'tips' && (
        <div className="space-y-2">
          {tips.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              暂无个性化提示
            </p>
          ) : (
            tips.map((tip, index) => (
              <div
                key={index}
                className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100"
              >
                <div className="flex items-start gap-2">
                  <Star className="text-purple-500 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
