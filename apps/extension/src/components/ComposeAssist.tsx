import React, { useState } from 'react';
import { Wand2, Copy, Check, ArrowRight } from 'lucide-react';
import { Button, Textarea, Card, CardContent, CardFooter, Loading } from './ui';
import { ToneSelector } from './ToneSelector';
import { LengthSelector } from './LengthSelector';
import type { ToneType, LengthType, AIComposeResponse } from '~/types';

interface ComposeAssistProps {
  onCompose: (params: { description: string; tone: ToneType; length: LengthType }) => Promise<void>;
  onInsert: (content: string) => void;
  result: AIComposeResponse | null;
  isLoading: boolean;
  error?: string | null;
}

export function ComposeAssist({
  onCompose,
  onInsert,
  result,
  isLoading,
  error,
}: ComposeAssistProps) {
  const [description, setDescription] = useState('');
  const [tone, setTone] = useState<ToneType>('formal');
  const [length, setLength] = useState<LengthType>('medium');
  const [copied, setCopied] = useState(false);

  const handleCompose = () => {
    if (!description.trim()) return;
    onCompose({ description, tone, length });
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `Subject: ${result.subject}\n\n${result.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Input */}
      <div className="space-y-4">
        <Textarea
          label="What would you like to write about?"
          placeholder="E.g., Request a meeting with the marketing team to discuss Q1 results..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        <ToneSelector value={tone} onChange={setTone} />
        <LengthSelector value={length} onChange={setLength} />

        <Button
          className="w-full"
          onClick={handleCompose}
          isLoading={isLoading}
          disabled={isLoading || !description.trim()}
          leftIcon={<Wand2 size={16} />}
        >
          Generate Email
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
          <Loading text="Composing email..." />
        </div>
      )}

      {/* Result */}
      {!isLoading && result && (
        <Card>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Subject</label>
                <p className="text-sm font-medium text-gray-800">{result.subject}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Body</label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.body}</p>
              </div>
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
              onClick={() => onInsert(result.body)}
              rightIcon={<ArrowRight size={14} />}
            >
              Insert Body
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
