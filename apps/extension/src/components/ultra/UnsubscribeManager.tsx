import React, { useState, useEffect } from 'react';
import { Mail, MailX, Shield, TrendingDown, Clock, RefreshCw, Filter, Trash2 } from 'lucide-react';

interface Subscription {
  id: string;
  senderName: string;
  senderEmail: string;
  category: string;
  avgPerWeek: number;
  readRate: number;
  status: 'active' | 'unsubscribed' | 'blocked';
  importance: 'high' | 'medium' | 'low';
  spamScore: number;
}

interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  weeklyEmailVolume: number;
  potentialTimeSaved: number;
  recommendations: Array<{
    type: string;
    subscription: Subscription;
    reason: string;
  }>;
}

interface UnsubscribeManagerProps {
  onUnsubscribe?: (subscription: Subscription) => void;
}

export function UnsubscribeManager({ onUnsubscribe }: UnsubscribeManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed' | 'recommended'>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, analyticsRes] = await Promise.all([
        fetch('/api/v1/ultra/unsubscribe/subscriptions'),
        fetch('/api/v1/ultra/unsubscribe/analytics'),
      ]);

      const subsData = await subsRes.json();
      const analyticsData = await analyticsRes.json();

      setSubscriptions(subsData.subscriptions || []);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async (subscription: Subscription) => {
    setProcessingIds(prev => new Set([...prev, subscription.id]));
    try {
      await fetch(`/api/v1/ultra/unsubscribe/${subscription.id}`, {
        method: 'POST',
      });

      // Update local state
      setSubscriptions(prev =>
        prev.map(s =>
          s.id === subscription.id ? { ...s, status: 'unsubscribed' as const } : s
        )
      );

      if (onUnsubscribe) {
        onUnsubscribe(subscription);
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(subscription.id);
        return next;
      });
    }
  };

  const handleBlock = async (subscription: Subscription) => {
    setProcessingIds(prev => new Set([...prev, subscription.id]));
    try {
      await fetch(`/api/v1/ultra/unsubscribe/${subscription.id}/block`, {
        method: 'POST',
      });

      setSubscriptions(prev =>
        prev.map(s =>
          s.id === subscription.id ? { ...s, status: 'blocked' as const } : s
        )
      );
    } catch (error) {
      console.error('Failed to block:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(subscription.id);
        return next;
      });
    }
  };

  const handleBulkUnsubscribe = async () => {
    const recommended = analytics?.recommendations
      .filter(r => r.type === 'unsubscribe')
      .map(r => r.subscription.id) || [];

    if (recommended.length === 0) return;

    try {
      await fetch('/api/v1/ultra/unsubscribe/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionIds: recommended }),
      });
      loadData();
    } catch (error) {
      console.error('Failed to bulk unsubscribe:', error);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      newsletter: '通讯',
      marketing: '营销',
      notifications: '通知',
      social: '社交',
      updates: '更新',
      promotions: '促销',
      other: '其他',
    };
    return labels[category] || category;
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-green-100 text-green-600';
      case 'medium':
        return 'bg-yellow-100 text-yellow-600';
      case 'low':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filter === 'all') return true;
    if (filter === 'active') return sub.status === 'active';
    if (filter === 'unsubscribed') return sub.status === 'unsubscribed';
    if (filter === 'recommended') {
      return analytics?.recommendations.some(
        r => r.type === 'unsubscribe' && r.subscription.id === sub.id
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MailX className="text-red-500" size={20} />
          <h3 className="font-semibold">退订管理</h3>
        </div>
        <button
          onClick={loadData}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Mail size={16} />
              <span className="text-xs">活跃订阅</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{analytics.activeSubscriptions}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <TrendingDown size={16} />
              <span className="text-xs">每周邮件</span>
            </div>
            <p className="text-xl font-bold text-purple-700">{analytics.weeklyEmailVolume}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg col-span-2">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Clock size={16} />
              <span className="text-xs">预计可节省时间</span>
            </div>
            <p className="text-xl font-bold text-green-700">{analytics.potentialTimeSaved} 分钟/周</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {analytics && analytics.recommendations.filter(r => r.type === 'unsubscribe').length > 0 && (
        <button
          onClick={handleBulkUnsubscribe}
          className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <Trash2 size={16} />
          一键退订推荐 ({analytics.recommendations.filter(r => r.type === 'unsubscribe').length})
        </button>
      )}

      {/* Filter */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {[
          { id: 'all', label: '全部' },
          { id: 'active', label: '活跃' },
          { id: 'recommended', label: '建议退订' },
          { id: 'unsubscribed', label: '已退订' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
              filter === f.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Subscription List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredSubscriptions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">暂无订阅</p>
        ) : (
          filteredSubscriptions.map((sub) => {
            const isRecommended = analytics?.recommendations.some(
              r => r.type === 'unsubscribe' && r.subscription.id === sub.id
            );
            const recommendation = analytics?.recommendations.find(
              r => r.subscription.id === sub.id
            );

            return (
              <div
                key={sub.id}
                className={`p-3 rounded-lg border ${
                  sub.status === 'unsubscribed'
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : isRecommended
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{sub.senderName}</p>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${getImportanceColor(sub.importance)}`}>
                        {getCategoryLabel(sub.category)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{sub.senderEmail}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>~{sub.avgPerWeek.toFixed(1)}封/周</span>
                      <span>阅读率 {sub.readRate.toFixed(0)}%</span>
                    </div>
                    {recommendation && (
                      <p className="text-xs text-red-600 mt-1">{recommendation.reason}</p>
                    )}
                  </div>
                  {sub.status === 'active' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUnsubscribe(sub)}
                        disabled={processingIds.has(sub.id)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                        title="退订"
                      >
                        {processingIds.has(sub.id) ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MailX size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleBlock(sub)}
                        disabled={processingIds.has(sub.id)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                        title="拉黑"
                      >
                        <Shield size={16} />
                      </button>
                    </div>
                  )}
                  {sub.status === 'unsubscribed' && (
                    <span className="text-xs text-gray-400">已退订</span>
                  )}
                  {sub.status === 'blocked' && (
                    <span className="text-xs text-red-400">已拉黑</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
