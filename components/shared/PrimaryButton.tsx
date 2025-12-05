// components/shared/PrimaryButton.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
}

export function PrimaryButton({
  href,
  children,
  className,
  disabled,
  ...buttonProps
}: PrimaryButtonProps) {
  const baseClasses =
    'group inline-flex items-center justify-center gap-3 px-8 py-3 text-sm md:text-base ' +
    'rounded-xl font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-primary-foreground ' +
    'shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 ' +
    'transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';

  const content = (
    <>
      <span>{children}</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={cn(baseClasses, className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(baseClasses, className)}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
