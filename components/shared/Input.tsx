// components/shared/Input.tsx
'use client';

import * as React from 'react';
import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  trailingIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, trailingIcon, className = '', id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hasError = Boolean(error);

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-muted-foreground"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-destructive">*</span>
            )}
          </label>
        )}

        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm',
              'shadow-sm transition-colors placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-60',
              hasError &&
                'border-destructive text-destructive placeholder:text-destructive/70 focus-visible:ring-destructive',
              trailingIcon && 'pr-10',
              className
            )}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            {...props}
          />

          {trailingIcon && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
              {trailingIcon}
            </span>
          )}
        </div>

        {hasError && (
          <p id={errorId} className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
