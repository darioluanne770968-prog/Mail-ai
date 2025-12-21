import React, { useState } from 'react';
import { Users, Brain, Scale, Heart, Briefcase, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface AgentResult {
  agentType: string;
  agentName: string;
  analysis: any;
  recommendations: string[];
  confidence: number;
}

interface CollaborationResult {
  taskId: string;
  agentResults: AgentResult[];
  synthesis: {
    summary: string;
    finalRecommendation: string;
    actionItems: string[];
    riskAssessment: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
    };
  };
}

interface AgentPanelProps {
  emailContent: string;
  onClose?: () => void;
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  negotiator: <Briefcase size={16} />,
  legal: <Scale size={16} />,
  emotional: <Heart size={16} />,
  coordinator: <Users size={16} />,
  default: <Brain size={16} />,
};

const AGENT_COLORS: Record<string, string> = {
  negotiator: 'bg-amber-100 text-amber-700 border-amber-200',
  legal: 'bg-blue-100 text-blue-700 border-blue-200',
  emotional: 'bg-pink-100 text-pink-700 border-pink-200',
  relationship: 'bg-purple-100 text-purple-700 border-purple-200',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function AgentPanel({ emailContent, onClose }: AgentPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CollaborationResult | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['negotiator', 'emotional', 'legal']);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const availableAgents = [
    { id: 'negotiator', name: '谈判专家', desc: '薪资谈判、商务议价' },
    { id: 'legal', name: '法务顾问', desc: '合同条款、法律风险' },
    { id: 'emotional', name: '情商专家', desc: '情绪分析、沟通策略' },
    { id: 'relationship', name: '关系管理', desc: '人脉维护、关系追踪' },
    { id: 'scheduler', name: '日程协调', desc: '会议安排、时间管理' },
    { id: 'summarizer', name: '摘要专家', desc: '要点提取、结构化总结' },
  ];

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(a => a !== agentId)
        : [...prev, agentId]
    );
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/super/agents/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent,
          agents: selectedAgents,
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Agent analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (agentType: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentType)) {
        next.delete(agentType);
      } else {
        next.add(agentType);
      }
      return next;
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="text-primary" size={20} />
        <h3 className="font-semibold">AI 专家团队分析</h3>
      </div>

      {!result && (
        <>
          {/* Agent Selection */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">选择参与分析的专家：</p>
            <div className="grid grid-cols-2 gap-2">
              {availableAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedAgents.includes(agent.id)
                      ? AGENT_COLORS[agent.id] || AGENT_COLORS.default
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {AGENT_ICONS[agent.id] || AGENT_ICONS.default}
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">{agent.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={runAnalysis}
            disabled={isLoading || selectedAgents.length === 0}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                专家分析中...
              </>
            ) : (
              <>
                <Brain size={16} />
                开始多专家分析
              </>
            )}
          </button>
        </>
      )}

      {result && (
        <div className="space-y-4">
          {/* Synthesis Summary */}
          <div className="bg-gradient-to-r from-primary/10 to-purple-100 p-4 rounded-lg">
            <h4 className="font-medium mb-2">综合分析结论</h4>
            <p className="text-sm text-gray-700">{result.synthesis.summary}</p>

            <div className="mt-3 p-3 bg-white/80 rounded-lg">
              <p className="text-sm font-medium text-primary">
                💡 {result.synthesis.finalRecommendation}
              </p>
            </div>

            {/* Risk Assessment */}
            <div className={`mt-3 px-3 py-2 rounded-lg ${getRiskColor(result.synthesis.riskAssessment.level)}`}>
              <span className="text-sm font-medium">
                风险等级: {result.synthesis.riskAssessment.level === 'high' ? '高' :
                         result.synthesis.riskAssessment.level === 'medium' ? '中' : '低'}
              </span>
              {result.synthesis.riskAssessment.factors.length > 0 && (
                <ul className="text-xs mt-1 list-disc list-inside">
                  {result.synthesis.riskAssessment.factors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Action Items */}
            {result.synthesis.actionItems.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-600 mb-1">行动项:</p>
                <ul className="space-y-1">
                  {result.synthesis.actionItems.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Individual Agent Results */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">各专家分析详情：</p>
            {result.agentResults.map((agentResult) => (
              <div
                key={agentResult.agentType}
                className={`border rounded-lg overflow-hidden ${AGENT_COLORS[agentResult.agentType] || AGENT_COLORS.default}`}
              >
                <button
                  onClick={() => toggleExpanded(agentResult.agentType)}
                  className="w-full p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {AGENT_ICONS[agentResult.agentType] || AGENT_ICONS.default}
                    <span className="font-medium">{agentResult.agentName}</span>
                    <span className="text-xs opacity-70">
                      置信度: {(agentResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {expandedAgents.has(agentResult.agentType) ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {expandedAgents.has(agentResult.agentType) && (
                  <div className="p-3 bg-white/50 border-t">
                    {agentResult.recommendations.length > 0 && (
                      <ul className="space-y-1">
                        {agentResult.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span>→</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reset Button */}
          <button
            onClick={() => setResult(null)}
            className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            重新分析
          </button>
        </div>
      )}
    </div>
  );
}
