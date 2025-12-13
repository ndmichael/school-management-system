"use client";

import * as React from "react";
import { useActionState, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { Input } from "@/components/shared/Input";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginResult } from "./actions";

const initialState: LoginResult = { success: false, error: "" };

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  // ✅ React 19 / Next.js 14
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  const errorMessage = useMemo(() => state?.error?.trim() ?? "", [state]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Top brand area */}
        <div className="mb-6 text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-black text-white grid place-items-center shadow-sm">
            <span className="text-lg font-semibold">SM</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Sign in
          </h1>
          <p className="text-sm text-zinc-600">
            Access your dashboard securely
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <form action={formAction} className="p-6 sm:p-8 space-y-5">
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

            <Input
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isPending}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="pointer-events-auto inline-flex items-center justify-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            {/* Error */}
            {errorMessage && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="text-sm font-medium text-destructive">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Actions */}
            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={isPending}
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
              <span className="text-xs text-zinc-500">
                Having trouble? Contact your administrator
              </span>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} School Management System
        </p>
      </div>
    </div>
  );
}
