// app/(auth)/_components/password-update-form.tsx
"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/shared/Input";
import { PrimaryButton } from "@/components/shared/PrimaryButton";

type Mode = "reset" | "set";

type Props = {
  mode: Mode;
};

type OnboardingCompleteResponse = { ok: true } | { error: string };

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readErrorMessage(v: unknown, fallback: string): string {
  if (!isRecord(v)) return fallback;
  const err = v.error;
  return typeof err === "string" && err.trim() ? err.trim() : fallback;
}

export default function PasswordUpdateForm({ mode }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const pwErr = validatePassword(password);
    setPasswordError(pwErr ?? undefined);

    const matchErr = password !== confirm ? "Passwords do not match." : null;
    setConfirmError(matchErr ?? undefined);

    if (pwErr || matchErr) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(error.message);
        return;
      }

      // ✅ Mark onboarding complete (only after password is set)
      const res = await fetch("/api/auth/onboarding/complete", { method: "POST" });

      if (!res.ok) {
        const json: unknown = await res.json().catch(() => null);
        setFormError(readErrorMessage(json, "Failed to finalize onboarding. Please try again."));
        return;
      }

      const _json: OnboardingCompleteResponse | null = (await res.json().catch(() => null)) as
        | OnboardingCompleteResponse
        | null;

      if (_json && "error" in _json) {
        setFormError(_json.error);
        return;
      }

      // Your desired behavior: set password -> go to login -> login routes them to dashboard
      await supabase.auth.signOut();
      const qs = mode === "set" ? "set=success" : "reset=success";
      router.replace(`/login?${qs}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border p-5 space-y-4">
      <Input
        label={mode === "set" ? "Create password" : "New password"}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(ev) => setPassword(ev.currentTarget.value)}
        required
        error={passwordError}
      />

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(ev) => setConfirm(ev.currentTarget.value)}
        required
        error={confirmError}
      />

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <PrimaryButton type="submit" loading={loading} rightIcon={null}>
        {mode === "set" ? "Set password" : "Update password"}
      </PrimaryButton>
    </form>
  );
}
