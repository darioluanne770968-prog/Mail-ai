import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary active:scale-95',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300 active:scale-95',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300 active:scale-95',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 active:scale-95',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="mail-ai-loading" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
