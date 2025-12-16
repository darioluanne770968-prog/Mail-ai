import React from 'react';
import { clsx } from 'clsx';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function Loading({ size = 'md', text, className }: LoadingProps) {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={clsx(
          'rounded-full border-gray-200 border-t-primary animate-spin',
          sizeStyles[size]
        )}
      />
      {text && <span className="text-sm text-gray-500">{text}</span>}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, text, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
          <Loading text={text} />
        </div>
      )}
    </div>
  );
}
