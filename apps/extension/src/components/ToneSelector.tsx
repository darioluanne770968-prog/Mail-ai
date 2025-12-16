import React from 'react';
import { clsx } from 'clsx';
import type { ToneType } from '~/types';

interface ToneSelectorProps {
  value: ToneType;
  onChange: (tone: ToneType) => void;
  compact?: boolean;
}

const TONES: { value: ToneType; label: string; emoji: string; color: string }[] = [
  { value: 'formal', label: 'Formal', emoji: '👔', color: 'bg-tone-formal' },
  { value: 'friendly', label: 'Friendly', emoji: '😊', color: 'bg-tone-friendly' },
  { value: 'concise', label: 'Concise', emoji: '⚡', color: 'bg-tone-concise' },
  { value: 'detailed', label: 'Detailed', emoji: '📝', color: 'bg-tone-detailed' },
  { value: 'casual', label: 'Casual', emoji: '👋', color: 'bg-tone-casual' },
];

export function ToneSelector({ value, onChange, compact }: ToneSelectorProps) {
  if (compact) {
    return (
      <div className="flex gap-1">
        {TONES.map((tone) => (
          <button
            key={tone.value}
            className={clsx(
              'px-2 py-1 rounded-md text-xs font-medium transition-all',
              value === tone.value
                ? `${tone.color} text-white`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            onClick={() => onChange(tone.value)}
            title={tone.label}
          >
            {tone.emoji}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Tone</label>
      <div className="grid grid-cols-5 gap-2">
        {TONES.map((tone) => (
          <button
            key={tone.value}
            className={clsx(
              'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
              value === tone.value
                ? 'border-primary bg-primary-light'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
            onClick={() => onChange(tone.value)}
          >
            <span className="text-xl">{tone.emoji}</span>
            <span className="text-xs font-medium text-gray-700">{tone.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
