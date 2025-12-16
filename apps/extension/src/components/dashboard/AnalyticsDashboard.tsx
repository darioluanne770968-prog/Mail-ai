import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Clock, Mail, Zap, Calendar,
  ChevronUp, ChevronDown, Minus, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, Button, Loading } from '../ui';

interface DailyStats {
  date: string;
  emailsSent: number;
  emailsReceived: number;
  emailsReplied: number;
  averageResponseTime: number;
  aiRequestsCount: number;
  tokensUsed: number;
  timeSaved: number;
}

interface ProductivityScore {
  overall: number;
  components: {
    responseSpeed: number;
    emailVolume: number;
    inboxZeroProgress: number;
    aiUtilization: number;
    consistency: number;
  };
  comparison: {
    vsLastWeek: number;
    vsLastMonth: number;
  };
  recommendations: string[];
}

interface AIInsights {
  totalRequests: number;
  totalTokensUsed: number;
  estimatedTimeSaved: number;
  mostUsedFeature: string;
  featureBreakdown: Record<string, number>;
  successRate: number;
  costEstimate: number;
}

export function AnalyticsDashboard() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [productivityScore, setProductivityScore] = useState<ProductivityScore | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'email' | 'ai'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // In production, call actual API
      const [statsRes, scoreRes, aiRes] = await Promise.all([
        fetch('http://localhost:3000/api/v1/analytics/daily-stats?days=7'),
        fetch('http://localhost:3000/api/v1/analytics/productivity-score'),
        fetch('http://localhost:3000/api/v1/analytics/ai-insights'),
      ]);

      const [statsData, scoreData, aiData] = await Promise.all([
        statsRes.json(),
        scoreRes.json(),
        aiRes.json(),
      ]);

      setDailyStats(statsData.data || []);
      setProductivityScore(scoreData.data);
      setAIInsights(aiData.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Use mock data for demo
      setProductivityScore({
        overall: 72,
        components: {
          responseSpeed: 85,
          emailVolume: 68,
          inboxZeroProgress: 45,
          aiUtilization: 90,
          consistency: 72,
        },
        comparison: { vsLastWeek: 5, vsLastMonth: 12 },
        recommendations: [
          'Try to respond to emails within 24 hours',
          'Great job using AI features!',
        ],
      });
      setAIInsights({
        totalRequests: 47,
        totalTokensUsed: 12500,
        estimatedTimeSaved: 94,
        mostUsedFeature: 'reply',
        featureBreakdown: { reply: 20, summarize: 15, compose: 8, improve: 4 },
        successRate: 98,
        costEstimate: 0.025,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ChevronUp className="text-green-500" size={16} />;
    if (value < 0) return <ChevronDown className="text-red-500" size={16} />;
    return <Minus className="text-gray-400" size={16} />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loading text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          Analytics Dashboard
        </h2>
        <Button variant="ghost" size="sm" onClick={loadAnalytics}>
          <RefreshCw size={14} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['overview', 'email', 'ai'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && productivityScore && (
        <>
          {/* Productivity Score */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">Productivity Score</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">vs last week</span>
                  <span className={`flex items-center ${productivityScore.comparison.vsLastWeek >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {getTrendIcon(productivityScore.comparison.vsLastWeek)}
                    {Math.abs(productivityScore.comparison.vsLastWeek)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Score Circle */}
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className={getScoreColor(productivityScore.overall)}
                      strokeDasharray={`${productivityScore.overall * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${getScoreColor(productivityScore.overall)}`}>
                      {productivityScore.overall}
                    </span>
                  </div>
                </div>

                {/* Component Scores */}
                <div className="flex-1 space-y-2">
                  {Object.entries(productivityScore.components).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-24 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            value >= 80 ? 'bg-green-500' :
                            value >= 60 ? 'bg-yellow-500' :
                            'bg-orange-500'
                          }`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-8">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {productivityScore.recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">RECOMMENDATIONS</h4>
                  <ul className="space-y-1">
                    {productivityScore.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Mail size={20} className="mx-auto text-blue-500 mb-1" />
                <div className="text-2xl font-bold text-gray-800">
                  {dailyStats.reduce((a, d) => a + d.emailsReplied, 0)}
                </div>
                <div className="text-xs text-gray-500">Emails Replied</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 text-center">
                <Clock size={20} className="mx-auto text-green-500 mb-1" />
                <div className="text-2xl font-bold text-gray-800">
                  {aiInsights?.estimatedTimeSaved || 0}m
                </div>
                <div className="text-xs text-gray-500">Time Saved</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 text-center">
                <Zap size={20} className="mx-auto text-purple-500 mb-1" />
                <div className="text-2xl font-bold text-gray-800">
                  {aiInsights?.totalRequests || 0}
                </div>
                <div className="text-xs text-gray-500">AI Requests</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 text-center">
                <TrendingUp size={20} className="mx-auto text-orange-500 mb-1" />
                <div className="text-2xl font-bold text-gray-800">
                  {aiInsights?.successRate || 0}%
                </div>
                <div className="text-xs text-gray-500">Success Rate</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'ai' && aiInsights && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium text-gray-700 flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              AI Usage Insights
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">
                  {aiInsights.estimatedTimeSaved}
                </div>
                <div className="text-xs text-purple-500">Minutes Saved</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">
                  ${aiInsights.costEstimate.toFixed(3)}
                </div>
                <div className="text-xs text-blue-500">Estimated Cost</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">FEATURE USAGE</h4>
              {Object.entries(aiInsights.featureBreakdown).map(([feature, count]) => {
                const total = Object.values(aiInsights.featureBreakdown).reduce((a, b) => a + b, 0);
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={feature} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 w-20 capitalize">{feature}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-12">{count} ({percentage}%)</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Tokens Used</span>
                <span className="font-medium">{aiInsights.totalTokensUsed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Most Used Feature</span>
                <span className="font-medium capitalize">{aiInsights.mostUsedFeature}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'email' && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Mail size={16} className="text-primary" />
              Email Activity (Last 7 Days)
            </h3>

            {/* Simple bar chart */}
            <div className="flex items-end gap-2 h-32">
              {dailyStats.slice(-7).map((day, i) => {
                const maxValue = Math.max(...dailyStats.map(d => d.emailsReceived + d.emailsSent));
                const height = maxValue > 0 ? ((day.emailsReceived + day.emailsSent) / maxValue) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-primary/20 rounded-t relative"
                      style={{ height: `${height}%` }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary rounded-t"
                        style={{ height: `${day.emailsReplied / (day.emailsReceived + day.emailsSent || 1) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 mt-1">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary/20" />
                <span className="text-gray-500">Received</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary" />
                <span className="text-gray-500">Replied</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
