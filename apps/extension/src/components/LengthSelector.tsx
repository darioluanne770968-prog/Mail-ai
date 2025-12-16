import React from 'react';
import { clsx } from 'clsx';
import type { LengthType } from '~/types';

interface LengthSelectorProps {
  value: LengthType;
  onChange: (length: LengthType) => void;
}

const LENGTHS: { value: LengthType; label: string; description: string }[] = [
  { value: 'short', label: 'Short', description: '1-2 sentences' },
  { value: 'medium', label: 'Medium', description: '1 paragraph' },
  { value: 'long', label: 'Long', description: 'Multiple paragraphs' },
];

export function LengthSelector({ value, onChange }: LengthSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Length</label>
      <div className="flex gap-2">
        {LENGTHS.map((length) => (
          <button
            key={length.value}
            className={clsx(
              'flex-1 py-2 px-3 rounded-lg border-2 transition-all text-center',
              value === length.value
                ? 'border-primary bg-primary-light'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
            onClick={() => onChange(length.value)}
          >
            <div className="text-sm font-medium text-gray-700">{length.label}</div>
            <div className="text-xs text-gray-500">{length.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
