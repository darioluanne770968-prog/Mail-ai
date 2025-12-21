import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, RefreshCw, CreditCard } from 'lucide-react';

interface FinancialSummary {
  income: { total: number; count: number };
  expenses: { total: number; byCategory: Record<string, number>; count: number };
  pending: { invoices: number; amount: number };
  subscriptions: { active: number; monthlyTotal: number; yearlyTotal: number };
  insights: string[];
  alerts: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

interface Subscription {
  id: string;
  vendor: string;
  service: string;
  amount: number;
  currency: string;
  frequency: string;
  nextBillingDate: string;
  status: string;
}

interface FinancialTrackerProps {
  userId?: string;
}

export function FinancialTracker({ userId = 'default' }: FinancialTrackerProps) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'overview' | 'subscriptions' | 'alerts'>('overview');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, subsRes] = await Promise.all([
        fetch(`/api/v1/super/financial/summary/${userId}`),
        fetch('/api/v1/super/financial/subscriptions'),
      ]);

      const summaryData = await summaryRes.json();
      const subsData = await subsRes.json();

      setSummary(summaryData);
      setSubscriptions(subsData.subscriptions || []);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue': return '⚠️';
      case 'upcoming': return '📅';
      case 'subscription_renewal': return '🔄';
      default: return '💡';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="text-green-500" size={20} />
          <h3 className="font-semibold">财务追踪器</h3>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {summary && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <TrendingUp size={16} />
                <span className="text-xs">收入</span>
              </div>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(summary.income.total)}
              </p>
              <p className="text-xs text-gray-500">{summary.income.count} 笔</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-rose-50 p-3 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <TrendingDown size={16} />
                <span className="text-xs">支出</span>
              </div>
              <p className="text-lg font-bold text-red-700">
                {formatCurrency(summary.expenses.total)}
              </p>
              <p className="text-xs text-gray-500">{summary.expenses.count} 笔</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-3 rounded-lg border border-amber-100">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertTriangle size={16} />
                <span className="text-xs">待付款</span>
              </div>
              <p className="text-lg font-bold text-amber-700">
                {formatCurrency(summary.pending.amount)}
              </p>
              <p className="text-xs text-gray-500">{summary.pending.invoices} 张发票</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <CreditCard size={16} />
                <span className="text-xs">订阅/月</span>
              </div>
              <p className="text-lg font-bold text-purple-700">
                {formatCurrency(summary.subscriptions.monthlyTotal)}
              </p>
              <p className="text-xs text-gray-500">{summary.subscriptions.active} 个活跃</p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex border-b">
            {[
              { id: 'overview', label: '分类明细' },
              { id: 'subscriptions', label: '订阅管理' },
              { id: 'alerts', label: `提醒 (${summary.alerts.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as any)}
                className={`flex-1 py-2 text-sm border-b-2 transition-colors ${
                  view === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview View */}
          {view === 'overview' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-600">支出分类:</p>
              {Object.entries(summary.expenses.byCategory).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(summary.expenses.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => {
                      const percentage = (amount / summary.expenses.total) * 100;
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{category}</span>
                            <span className="font-medium">{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {summary.insights.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 mb-2">💡 洞察</p>
                  <ul className="space-y-1">
                    {summary.insights.map((insight, i) => (
                      <li key={i} className="text-sm text-gray-600">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Subscriptions View */}
          {view === 'subscriptions' && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {subscriptions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">暂无订阅记录</p>
              ) : (
                subscriptions.map(sub => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{sub.vendor}</p>
                      <p className="text-xs text-gray-500">{sub.service}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(sub.amount, sub.currency)}
                        <span className="text-xs text-gray-500 ml-1">
                          /{sub.frequency === 'monthly' ? '月' : sub.frequency === 'yearly' ? '年' : sub.frequency}
                        </span>
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>
                          {new Date(sub.nextBillingDate).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {subscriptions.length > 0 && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700">
                    年度订阅总支出: <strong>{formatCurrency(summary.subscriptions.yearlyTotal)}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Alerts View */}
          {view === 'alerts' && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {summary.alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                  <p>暂无提醒</p>
                </div>
              ) : (
                summary.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getPriorityColor(alert.priority)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getAlertIcon(alert.type)}</span>
                      <p className="text-sm">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {!summary && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
          <p>加载财务数据中...</p>
        </div>
      )}
    </div>
  );
}
