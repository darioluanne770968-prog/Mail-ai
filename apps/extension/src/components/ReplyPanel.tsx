import React, { useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { Button, Card, CardContent, CardFooter, Loading } from './ui';
import { ToneSelector } from './ToneSelector';
import { LengthSelector } from './LengthSelector';
import { Badge } from './ui/Badge';
import type { ToneType, LengthType, GeneratedReply } from '~/types';

interface ReplyPanelProps {
  emailContent: string;
  threadContext?: string;
  onGenerate: (params: { tone: ToneType; length: LengthType }) => Promise<void>;
  onInsert: (content: string) => void;
  replies: GeneratedReply[];
  isLoading: boolean;
  error?: string | null;
}

export function ReplyPanel({
  emailContent,
  onGenerate,
  onInsert,
  replies,
  isLoading,
  error,
}: ReplyPanelProps) {
  const [tone, setTone] = useState<ToneType>('formal');
  const [length, setLength] = useState<LengthType>('medium');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = () => {
    onGenerate({ tone, length });
  };

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!emailContent) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No email selected.</p>
        <p className="text-sm mt-2">Open an email to generate AI replies.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="space-y-4">
        <ToneSelector value={tone} onChange={setTone} />
        <LengthSelector value={length} onChange={setLength} />

        <Button
          className="w-full"
          onClick={handleGenerate}
          isLoading={isLoading}
          disabled={isLoading}
        >
          Generate Reply
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-8">
          <Loading text="Generating reply..." />
        </div>
      )}

      {/* Results */}
      {!isLoading && replies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Generated Replies</h3>
          {replies.map((reply, index) => (
            <Card key={index} className="relative">
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="tone" tone={reply.tone}>
                    {reply.tone}
                  </Badge>
                  <span className="text-xs text-gray-400">Option {index + 1}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(reply.content, index)}
                  leftIcon={copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                >
                  {copiedIndex === index ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onInsert(reply.content)}
                  rightIcon={<ArrowRight size={14} />}
                >
                  Insert
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
