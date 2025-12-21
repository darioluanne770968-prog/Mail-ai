import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, TrendingUp, TrendingDown, Minus, Bell, RefreshCw } from 'lucide-react';

interface NetworkNode {
  id: string;
  label: string;
  email: string;
  type: string;
  strength: number;
  health: number;
  color: string;
}

interface NetworkGraph {
  nodes: NetworkNode[];
  clusters: Array<{
    id: string;
    name: string;
    nodeIds: string[];
    color: string;
  }>;
  stats: {
    totalContacts: number;
    activeContacts: number;
    atRiskContacts: number;
    averageStrength: number;
  };
}

interface RelationshipInsight {
  type: 'warning' | 'opportunity' | 'suggestion';
  contactName: string;
  title: string;
  message: string;
  priority: string;
}

interface RelationshipGraphProps {
  userId?: string;
}

const TYPE_LABELS: Record<string, string> = {
  colleague: '同事',
  client: '客户',
  vendor: '供应商',
  friend: '朋友',
  family: '家人',
  acquaintance: '熟人',
  unknown: '未分类',
};

export function RelationshipGraph({ userId = 'default' }: RelationshipGraphProps) {
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [insights, setInsights] = useState<RelationshipInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [view, setView] = useState<'graph' | 'list' | 'insights'>('graph');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [graphRes, insightsRes] = await Promise.all([
        fetch(`/api/v1/super/relationships/graph/${userId}`),
        fetch(`/api/v1/super/relationships/insights/${userId}`),
      ]);

      const graphData = await graphRes.json();
      const insightsData = await insightsRes.json();

      setGraph(graphData);
      setInsights(insightsData.insights || []);
    } catch (error) {
      console.error('Failed to load relationship data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (health: number) => {
    if (health >= 70) return <TrendingUp size={14} className="text-green-500" />;
    if (health <= 40) return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const getHealthColor = (health: number) => {
    if (health >= 70) return 'bg-green-100 text-green-700';
    if (health <= 40) return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const filteredNodes = selectedCluster
    ? graph?.nodes.filter(n => {
        const cluster = graph.clusters.find(c => c.id === selectedCluster);
        return cluster?.nodeIds.includes(n.id);
      })
    : graph?.nodes;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="text-purple-500" size={20} />
          <h3 className="font-semibold">关系智能图谱</h3>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats Overview */}
      {graph && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-blue-50 p-2 rounded-lg text-center">
            <p className="text-xl font-bold text-blue-600">{graph.stats.totalContacts}</p>
            <p className="text-xs text-gray-600">总联系人</p>
          </div>
          <div className="bg-green-50 p-2 rounded-lg text-center">
            <p className="text-xl font-bold text-green-600">{graph.stats.activeContacts}</p>
            <p className="text-xs text-gray-600">活跃</p>
          </div>
          <div className="bg-red-50 p-2 rounded-lg text-center">
            <p className="text-xl font-bold text-red-600">{graph.stats.atRiskContacts}</p>
            <p className="text-xs text-gray-600">需关注</p>
          </div>
          <div className="bg-purple-50 p-2 rounded-lg text-center">
            <p className="text-xl font-bold text-purple-600">
              {(graph.stats.averageStrength * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-600">平均强度</p>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex border-b">
        {[
          { id: 'graph', label: '图谱视图' },
          { id: 'list', label: '列表视图' },
          { id: 'insights', label: `洞察 (${insights.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={`flex-1 py-2 text-sm border-b-2 transition-colors ${
              view === tab.id
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Graph View */}
      {view === 'graph' && graph && (
        <div className="space-y-3">
          {/* Cluster Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCluster(null)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                !selectedCluster ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {graph.clusters.map(cluster => (
              <button
                key={cluster.id}
                onClick={() => setSelectedCluster(cluster.id)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedCluster === cluster.id
                    ? 'text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: selectedCluster === cluster.id ? cluster.color : undefined,
                }}
              >
                {cluster.name} ({cluster.nodeIds.length})
              </button>
            ))}
          </div>

          {/* Visual Graph (Simplified) */}
          <div className="relative h-64 bg-gray-50 rounded-lg overflow-hidden">
            {filteredNodes?.map((node, index) => {
              const angle = (index / (filteredNodes.length || 1)) * 2 * Math.PI;
              const radius = 80;
              const x = 50 + radius * Math.cos(angle) * (0.8 + node.strength * 0.2);
              const y = 50 + radius * Math.sin(angle) * (0.8 + node.strength * 0.2);

              return (
                <div
                  key={node.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-transform group-hover:scale-125"
                    style={{ backgroundColor: node.color }}
                  >
                    {node.label[0]}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {node.label}
                    <br />
                    健康度: {node.health}%
                  </div>
                </div>
              );
            })}
            {/* Center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg">
                <Users size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && graph && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {graph.nodes.map(node => (
            <div
              key={node.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: node.color }}
              >
                {node.label[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{node.label}</p>
                <p className="text-xs text-gray-500 truncate">{node.email}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {getTrendIcon(node.health)}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getHealthColor(node.health)}`}>
                    {node.health}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{TYPE_LABELS[node.type] || node.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights View */}
      {view === 'insights' && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {insights.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无关系洞察</p>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  insight.type === 'warning'
                    ? 'bg-amber-50 border-amber-400'
                    : insight.type === 'opportunity'
                    ? 'bg-green-50 border-green-400'
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {insight.type === 'warning' && <AlertTriangle size={14} className="text-amber-600" />}
                  <span className="font-medium text-sm">{insight.title}</span>
                </div>
                <p className="text-sm text-gray-600">{insight.message}</p>
                <p className="text-xs text-gray-500 mt-1">关于: {insight.contactName}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
