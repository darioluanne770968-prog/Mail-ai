import React, { useState } from 'react';
import { Sparkles, Languages, Minimize2, Maximize2, GraduationCap, Copy, Check, ArrowRight } from 'lucide-react';
import { Button, Textarea, Card, CardContent, CardFooter, Loading, Select } from './ui';
import type { AIImproveResponse } from '~/types';

type ImproveAction = 'grammar' | 'professional' | 'expand' | 'shorten' | 'translate';

interface ImprovePanelProps {
  currentContent: string;
  onImprove: (params: { content: string; action: ImproveAction; targetLanguage?: string }) => Promise<void>;
  onInsert: (content: string) => void;
  result: AIImproveResponse | null;
  isLoading: boolean;
  error?: string | null;
}

const ACTIONS: { value: ImproveAction; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'grammar', label: 'Fix Grammar', icon: <Sparkles size={16} />, description: 'Fix spelling and grammar' },
  { value: 'professional', label: 'Make Professional', icon: <GraduationCap size={16} />, description: 'Formal business style' },
  { value: 'expand', label: 'Expand', icon: <Maximize2 size={16} />, description: 'Add more detail' },
  { value: 'shorten', label: 'Shorten', icon: <Minimize2 size={16} />, description: 'Make it concise' },
  { value: 'translate', label: 'Translate', icon: <Languages size={16} />, description: 'Convert to another language' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese (中文)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'ja', label: 'Japanese (日本語)' },
  { value: 'ko', label: 'Korean (한국어)' },
  { value: 'pt', label: 'Portuguese (Português)' },
  { value: 'ru', label: 'Russian (Русский)' },
  { value: 'ar', label: 'Arabic (العربية)' },
];

export function ImprovePanel({
  currentContent,
  onImprove,
  onInsert,
  result,
  isLoading,
  error,
}: ImprovePanelProps) {
  const [content, setContent] = useState(currentContent);
  const [selectedAction, setSelectedAction] = useState<ImproveAction>('grammar');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [copied, setCopied] = useState(false);

  const handleImprove = () => {
    if (!content.trim()) return;
    onImprove({
      content,
      action: selectedAction,
      targetLanguage: selectedAction === 'translate' ? targetLanguage : undefined,
    });
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.improvedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Content Input */}
      <Textarea
        label="Content to improve"
        placeholder="Paste or type the content you want to improve..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
      />

      {/* Action Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Action</label>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.value}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                selectedAction === action.value
                  ? 'border-primary bg-primary-light'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => setSelectedAction(action.value)}
            >
              <span className="text-primary">{action.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-700">{action.label}</div>
                <div className="text-xs text-gray-500">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Language Selection (for translate) */}
      {selectedAction === 'translate' && (
        <Select
          label="Target Language"
          options={LANGUAGES}
          value={targetLanguage}
          onChange={setTargetLanguage}
        />
      )}

      {/* Improve Button */}
      <Button
        className="w-full"
        onClick={handleImprove}
        isLoading={isLoading}
        disabled={isLoading || !content.trim()}
        leftIcon={<Sparkles size={16} />}
      >
        Improve Content
      </Button>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-8">
          <Loading text="Improving content..." />
        </div>
      )}

      {/* Result */}
      {!isLoading && result && (
        <Card>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Improved Content</label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{result.improvedContent}</p>
              </div>
              {result.changes && result.changes.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Changes Made</label>
                  <ul className="mt-1 space-y-1">
                    {result.changes.map((change, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                        <span className="text-green-500">✓</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onInsert(result.improvedContent)}
              rightIcon={<ArrowRight size={14} />}
            >
              Insert
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
