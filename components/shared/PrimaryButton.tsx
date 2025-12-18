'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;

  /** Shows spinner + disables interactions */
  loading?: boolean;

  /** Override right-side icon; set to null to hide icon completely */
  rightIcon?: React.ReactNode | null;

  /** Optional left icon */
  leftIcon?: React.ReactNode;

  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
};

export function PrimaryButton({
  href,
  children,
  className,
  disabled,
  loading = false,
  rightIcon,
  leftIcon,
  size = 'md',
  type, // allow submit
  ...buttonProps
}: Props) {
  const isDisabled = Boolean(disabled || loading);

  const sizeClasses =
    size === 'sm'
      ? 'px-5 py-2.5 text-sm'
      : size === 'lg'
      ? 'px-8 py-3.5 text-base'
      : 'px-7 py-3 text-sm md:text-base';

  const baseClasses = cn(
    // layout
    'group relative inline-flex items-center justify-center gap-2.5 rounded-xl font-semibold',
    sizeClasses,

    // colors
    'text-white',
    'bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700',

    // depth + border
    'shadow-lg shadow-primary-500/25',
    'ring-1 ring-inset ring-white/10',

    // hover/active
    'transition-all duration-200',
    'hover:shadow-xl hover:shadow-primary-500/35 hover:-translate-y-[1px]',
    'active:translate-y-0 active:shadow-lg',

    // focus (keyboard)
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white',

    // disabled
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:translate-y-0',
    className
  );

  const shineClasses = cn(
    // subtle shine layer
    'cursor-pointer pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200',
    'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_45%)]',
    !isDisabled && 'group-hover:opacity-100'
  );

  const content = (
    <>
      <span className={shineClasses} />
      <span className="relative inline-flex items-center gap-2.5">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="inline-flex">{leftIcon}</span>
        ) : null}

        <span>{children}</span>

        {rightIcon === null ? null : (
          <span className="inline-flex">
            {rightIcon ?? (
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            )}
          </span>
        )}
      </span>
    </>
  );

  // Link mode (only when enabled)
  if (href) {
    return (
      <Link
        href={href}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
        className={cn(
          baseClasses,
          isDisabled && 'pointer-events-none select-none'
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type ?? 'button'}
      disabled={isDisabled}
      className={baseClasses}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
