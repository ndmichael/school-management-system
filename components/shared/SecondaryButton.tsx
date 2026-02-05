'use client';

import { Play } from 'lucide-react';

interface SecondaryButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SecondaryButton({ 
  onClick, 
  children, 
  className = '',
  disabled = false 
}: SecondaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex items-center justify-center gap-3 px-8 py-3 text-base rounded-xl font-semibold bg-white text-gray-900 border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
    >
      <div className="w-7 h-7 bg-linear-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
        <Play className="w-3 h-3 text-white ml-0.5" />
      </div>
      <span>{children}</span>
    </button>
  );
}