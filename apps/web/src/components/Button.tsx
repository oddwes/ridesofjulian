import React, { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  resetOnClick?: boolean;
}

export function Button({
  variant = 'primary',
  disabled,
  children,
  className = '',
  onClick,
  resetOnClick = false,
  ...props
}: ButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const baseClasses = 'px-4 py-2 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-blue-600 text-white border border-transparent focus:ring-blue-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 focus:ring-blue-500',
    danger: 'border border-red-500 text-red-500',
  };

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={() => {
        setIsLoading(true);
        onClick();
        if (resetOnClick) {
          setIsLoading(false);
        }
      }}
      {...props}
    >
      {isLoading ? <div className="px-8"><LoadingSpinner size={10} /></div> : children}
    </button>
  );
}

