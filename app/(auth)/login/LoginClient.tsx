'use client'

import * as React from 'react'
import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'

import { Input } from '@/components/shared/Input'
import { Button } from '@/components/ui/button'
import { loginAction, type LoginResult } from './actions'

const initialState: LoginResult = { success: false, error: '' }

export default function LoginClient() {
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)

  const [state, formAction, isPending] = useActionState(loginAction, initialState)
  const errorMessage = useMemo(() => state?.error?.trim() ?? '', [state])

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/60">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500" />

        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Access your dashboard securely</p>
        </div>

        <form action={formAction} className="space-y-5 p-6 sm:p-8">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            trailingIcon={<Mail className="h-4 w-4" />}
            disabled={isPending}
          />

          <div className="space-y-2">
            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isPending}
              onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (typeof e.getModifierState === 'function') {
                  setCapsOn(e.getModifierState('CapsLock'))
                }
              }}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isPending}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              {capsOn ? <p className="text-xs font-medium text-amber-700">Caps Lock is on</p> : <span />}

              <Link
                href="/forgot-password"
                aria-disabled={isPending}
                tabIndex={isPending ? -1 : 0}
                className={[
                  'text-xs font-semibold text-primary-700 hover:underline',
                  isPending ? 'pointer-events-none opacity-60' : '',
                ].join(' ')}
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
              <p className="mt-0.5 text-xs text-red-700/80">
                Double-check your email and password and try again.
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className={[
              'cursor-pointer w-full rounded-xl px-5 py-6 text-sm font-semibold text-white',
              'bg-linear-to-r from-primary-600 via-primary-600 to-secondary-500',
              'shadow-lg shadow-primary-500/20',
              'hover:shadow-xl hover:shadow-primary-500/30',
              'active:scale-[0.99]',
              'disabled:pointer-events-none disabled:opacity-60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2',
            ].join(' ')}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Sign in
              </>
            )}
          </Button>

          <div className="pt-1 text-center">
            <span className="text-xs text-slate-500">Having trouble? Contact your administrator</span>
          </div>
        </form>
      </div>
    </div>
  )
}
