'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface PrimaryButtonProps {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function PrimaryButton({ 
  href, 
  children, 
  onClick, 
  className = '',
  disabled = false 
}: PrimaryButtonProps) {
  const buttonClasses = `group inline-flex items-center justify-center gap-3 px-8 py-4 text-base rounded-xl font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={buttonClasses}>
        {children}
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={buttonClasses}
    >
      {children}
      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}