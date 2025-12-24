"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/shared/Input";
import { PrimaryButton } from "@/components/shared/PrimaryButton";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ForgotPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/api/auth/confirm?next=/reset-password`;



      const { error: supaError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      // Don’t enumerate users; always show success UX
      if (supaError) {
        setDone(true);
        return;
      }

      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border p-5">
        <p className="text-sm">
          If an account exists for that email, a reset link has been sent.
        </p>

        <div className="mt-4">
          <PrimaryButton href="/login" rightIcon={null} size="sm">
            Back to login
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border p-5 space-y-4">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(ev) => setEmail(ev.currentTarget.value)}
        required
        error={error}
      />

      <PrimaryButton type="submit" loading={loading} rightIcon={null}>
        Send reset link
      </PrimaryButton>

      <button
        type="button"
        className="text-sm underline text-muted-foreground"
        onClick={() => router.push("/login")}
      >
        Back to login
      </button>
    </form>
  );
}
