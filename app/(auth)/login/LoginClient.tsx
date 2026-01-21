"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { Input } from "@/components/shared/Input";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginResult } from "./actions";

const initialState: LoginResult = { success: false, error: "" };

type ResendInviteResponse = { ok: true };

export default function LoginClient() {
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const errorMessage = useMemo(() => state?.error?.trim() ?? "", [state]);

  const sp = useSearchParams();
  const urlError = (sp.get("error") ?? "").trim();

  const [hashErrorCode, setHashErrorCode] = React.useState<string>("");

  React.useEffect(() => {
    const h = typeof window !== "undefined" ? window.location.hash : "";
    const raw = h.startsWith("#") ? h.slice(1) : h;
    const params = new URLSearchParams(raw);
    setHashErrorCode((params.get("error_code") ?? "").trim());
  }, []);

  const isExpired =
    urlError === "invalid_link" ||
    urlError === "otp_expired" ||
    hashErrorCode === "otp_expired";

  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  async function resendInvite() {
    const email = resendEmail.trim().toLowerCase();
    if (!email) return;

    setResendLoading(true);
    setResendDone(false);

    try {
      const r = await fetch("/api/auth/resend-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (r.ok) {
        await r.json().catch(() => null);
        setResendDone(true);
        setResendEmail("");
      } else {
        setResendDone(true);
      }
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/60">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary-600 via-primary-500 to-secondary-500" />

        <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-white p-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Access your dashboard securely</p>
        </div>

        <form action={formAction} className="space-y-5 p-6 sm:p-8">
          {isExpired && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                This link is invalid or has expired.
              </p>

              <p className="mt-0.5 text-xs text-amber-900/80">
                If you’ve already set a password, simply sign in below.
                Otherwise, enter your email to receive a new setup link.
              </p>

              <div className="mt-3 space-y-2">
                <Input
                  label="Email"
                  type="email"
                  value={resendEmail}
                  onChange={(ev) => setResendEmail(ev.currentTarget.value)}
                  disabled={resendLoading || isPending}
                  required
                  trailingIcon={<Mail className="h-4 w-4" />}
                />

                <Button
                  type="button"
                  onClick={resendInvite}
                  disabled={resendLoading || isPending || !resendEmail.trim()}
                  className={[
                    "w-full rounded-xl px-5 py-6 text-sm font-semibold text-white",
                    "bg-linear-to-r from-primary-600 via-primary-600 to-secondary-500",
                    "shadow-lg shadow-primary-500/20",
                    "hover:shadow-xl hover:shadow-primary-500/30",
                    "active:scale-[0.99]",
                    "disabled:pointer-events-none disabled:opacity-60",
                  ].join(" ")}
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Resend setup link"
                  )}
                </Button>

                {resendDone && (
                  <p className="text-xs text-amber-900/80">
                    If an account exists for that email, a new link has been sent.
                  </p>
                )}
              </div>
            </div>
          )}

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
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isPending}
              onKeyUp={(e) => {
                if (typeof e.getModifierState === "function") {
                  setCapsOn(e.getModifierState("CapsLock"));
                }
              }}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isPending}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              {capsOn ? (
                <p className="text-xs font-medium text-amber-700">Caps Lock is on</p>
              ) : (
                <span />
              )}

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary-700 hover:underline"
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
              "w-full rounded-xl px-5 py-6 text-sm font-semibold text-white",
              "bg-linear-to-r from-primary-600 via-primary-600 to-secondary-500",
              "shadow-lg shadow-primary-500/20",
              "hover:shadow-xl hover:shadow-primary-500/30",
              "active:scale-[0.99]",
              "disabled:pointer-events-none disabled:opacity-60",
            ].join(" ")}
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
            <span className="text-xs text-slate-500">
              Having trouble? Contact your administrator
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
