import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'tone';
type ToneColor = 'formal' | 'friendly' | 'concise' | 'detailed' | 'casual';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  tone?: ToneColor;
  className?: string;
}

export function Badge({ children, variant = 'default', tone, className }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    tone: '',
  };

  const toneStyles: Record<ToneColor, string> = {
    formal: 'bg-blue-100 text-blue-700',
    friendly: 'bg-green-100 text-green-700',
    concise: 'bg-orange-100 text-orange-700',
    detailed: 'bg-purple-100 text-purple-700',
    casual: 'bg-pink-100 text-pink-700',
  };

  const getStyles = () => {
    if (variant === 'tone' && tone) {
      return toneStyles[tone];
    }
    return variantStyles[variant];
  };

  return (
    <span className={clsx('mail-ai-badge', getStyles(), className)}>
      {children}
    </span>
  );
}
