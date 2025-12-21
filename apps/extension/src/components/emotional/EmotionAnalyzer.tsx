import React, { useState } from 'react';
import { Heart, AlertTriangle, Clock, Lightbulb, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';

interface EmotionAnalysis {
  primary: {
    emotion: string;
    intensity: number;
    confidence: number;
  };
  secondary: Array<{
    emotion: string;
    intensity: number;
  }>;
  hidden: {
    emotion: string | null;
    reasoning: string;
  };
  triggers: string[];
  sentiment: {
    score: number;
    label: string;
  };
}

interface TimingRecommendation {
  bestTimeToRespond: {
    recommendation: string;
    hours?: number;
    reason: string;
  };
  cooldownNeeded: boolean;
  risksOfImmediateResponse: string[];
}

interface EmpatheticResponse {
  suggestedTone: string;
  openingOptions: string[];
  keyMessages: string[];
  wordsToAvoid: string[];
  wordsToUse: string[];
  fullDraft: string;
}

interface EmotionAnalyzerProps {
  emailContent: string;
  onInsert?: (content: string) => void;
}

const EMOTION_EMOJIS: Record<string, string> = {
  happy: '😊', sad: '😢', angry: '😠', fearful: '😨', surprised: '😲',
  anxious: '😰', frustrated: '😤', disappointed: '😞', hopeful: '🤞',
  grateful: '🙏', confused: '😕', excited: '🎉', relieved: '😌',
  nervous: '😬', confident: '😎', hurt: '💔', neutral: '😐',
};

const SENTIMENT_COLORS: Record<string, string> = {
  very_negative: 'bg-red-500',
  negative: 'bg-orange-500',
  neutral: 'bg-gray-400',
  positive: 'bg-green-400',
  very_positive: 'bg-green-600',
};

export function EmotionAnalyzer({ emailContent, onInsert }: EmotionAnalyzerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<EmotionAnalysis | null>(null);
  const [timing, setTiming] = useState<TimingRecommendation | null>(null);
  const [empathyResponse, setEmpathyResponse] = useState<EmpatheticResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'timing' | 'response'>('analysis');

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      // Emotion analysis
      const emotionRes = await fetch('/api/v1/super/emotional/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: emailContent }),
      });
      const emotionData = await emotionRes.json();
      setAnalysis(emotionData);

      // Timing recommendation
      const timingRes = await fetch('/api/v1/super/emotional/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent, emotionAnalysis: emotionData }),
      });
      const timingData = await timingRes.json();
      setTiming(timingData);

      // Empathetic response
      const responseRes = await fetch('/api/v1/super/emotional/empathetic-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent,
          emotionAnalysis: emotionData,
          responseGoal: '理解并安抚对方情绪',
        }),
      });
      const responseData = await responseRes.json();
      setEmpathyResponse(responseData);
    } catch (error) {
      console.error('Emotion analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'analysis', label: '情绪分析', icon: <Heart size={14} /> },
    { id: 'timing', label: '回复时机', icon: <Clock size={14} /> },
    { id: 'response', label: '同理回复', icon: <Lightbulb size={14} /> },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="text-pink-500" size={20} />
        <h3 className="font-semibold">情感智能分析</h3>
      </div>

      {!analysis && (
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              分析情绪中...
            </>
          ) : (
            <>
              <Heart size={16} />
              分析邮件情绪
            </>
          )}
        </button>
      )}

      {analysis && (
        <>
          {/* Tabs */}
          <div className="flex border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 text-sm flex items-center justify-center gap-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              {/* Primary Emotion */}
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">主要情绪</span>
                  <span className="text-3xl">{EMOTION_EMOJIS[analysis.primary.emotion] || '😐'}</span>
                </div>
                <div className="text-xl font-bold capitalize">{analysis.primary.emotion}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">强度:</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all"
                      style={{ width: `${analysis.primary.intensity * 10}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{analysis.primary.intensity}/10</span>
                </div>
              </div>

              {/* Hidden Emotion */}
              {analysis.hidden.emotion && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">隐藏情绪</span>
                  </div>
                  <p className="text-sm mt-1">
                    <span className="font-medium">{EMOTION_EMOJIS[analysis.hidden.emotion]} {analysis.hidden.emotion}</span>
                    <span className="text-gray-600"> - {analysis.hidden.reasoning}</span>
                  </p>
                </div>
              )}

              {/* Sentiment Score */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">情感倾向:</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden relative">
                  <div
                    className={`absolute h-full rounded-full ${SENTIMENT_COLORS[analysis.sentiment.label]}`}
                    style={{
                      left: '50%',
                      width: `${Math.abs(analysis.sentiment.score) * 50}%`,
                      transform: analysis.sentiment.score < 0 ? 'translateX(-100%)' : 'translateX(0)',
                    }}
                  />
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400" />
                </div>
                <div className="flex items-center gap-1">
                  {analysis.sentiment.score < 0 ? <ThumbsDown size={14} className="text-red-500" /> : <ThumbsUp size={14} className="text-green-500" />}
                  <span className="text-xs">{(analysis.sentiment.score * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Triggers */}
              {analysis.triggers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">情绪触发点:</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.triggers.map((trigger, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timing Tab */}
          {activeTab === 'timing' && timing && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                timing.cooldownNeeded ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className={timing.cooldownNeeded ? 'text-amber-600' : 'text-green-600'} />
                  <span className="font-medium">
                    {timing.bestTimeToRespond.recommendation === 'immediate' ? '立即回复' :
                     timing.bestTimeToRespond.recommendation === 'within_hours' ? `${timing.bestTimeToRespond.hours}小时内回复` :
                     timing.bestTimeToRespond.recommendation === 'next_day' ? '明天回复' : '等待回复'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{timing.bestTimeToRespond.reason}</p>
              </div>

              {timing.risksOfImmediateResponse.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-700 mb-2">立即回复的风险:</p>
                  <ul className="space-y-1">
                    {timing.risksOfImmediateResponse.map((risk, i) => (
                      <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                        <span>⚠️</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Response Tab */}
          {activeTab === 'response' && empathyResponse && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-700 mb-1">建议语气:</p>
                <p className="text-sm">{empathyResponse.suggestedTone}</p>
              </div>

              {/* Opening Options */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">开场白选项:</p>
                <div className="space-y-2">
                  {empathyResponse.openingOptions.map((opening, i) => (
                    <button
                      key={i}
                      onClick={() => onInsert?.(opening)}
                      className="w-full p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      "{opening}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Words to Avoid / Use */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <p className="text-xs font-medium text-red-700 mb-1">避免使用:</p>
                  <div className="flex flex-wrap gap-1">
                    {empathyResponse.wordsToAvoid.slice(0, 5).map((word, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="text-xs font-medium text-green-700 mb-1">推荐使用:</p>
                  <div className="flex flex-wrap gap-1">
                    {empathyResponse.wordsToUse.slice(0, 5).map((word, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Draft */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">完整回复草稿:</p>
                <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                  {empathyResponse.fullDraft}
                </div>
                <button
                  onClick={() => onInsert?.(empathyResponse.fullDraft)}
                  className="w-full mt-2 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm"
                >
                  使用此回复
                </button>
              </div>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={() => {
              setAnalysis(null);
              setTiming(null);
              setEmpathyResponse(null);
            }}
            className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            重新分析
          </button>
        </>
      )}
    </div>
  );
}
