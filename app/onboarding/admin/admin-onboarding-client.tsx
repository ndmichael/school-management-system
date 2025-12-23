"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  UserRound,
} from "lucide-react";

type ProfileRow = {
  id: string;
  email: string;
  main_role: "admin" | "student" | "academic_staff" | "non_academic_staff";
  onboarding_status: string;
  first_name: string;
  last_name: string;
};

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNum = /\d/.test(pw);
  if (!hasUpper || !hasLower || !hasNum) {
    return "Use at least 1 uppercase, 1 lowercase, and 1 number.";
  }
  return null;
}

function strengthFlags(pw: string) {
  return {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    num: /\d/.test(pw),
  };
}

export default function AdminOnboardingClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const code = sp.get("code") ?? "";
  const tokenHash = sp.get("token_hash") ?? "";
  const type = sp.get("type") ?? "";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [saving, setSaving] = useState(false);

  const flags = useMemo(() => strengthFlags(pw1), [pw1]);

  const pwError = useMemo(() => {
    if (!pw1 && !pw2) return null;
    if (pw1 !== pw2) return "Passwords do not match.";
    return validatePassword(pw1);
  }, [pw1, pw2]);

  const canSubmit = useMemo(() => {
    return pw1.length > 0 && pw2.length > 0 && pw1 === pw2 && validatePassword(pw1) === null;
  }, [pw1, pw2]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      setLoading(true);
      setFatal(null);

      try {
        // Establish session from invite link (supports both flows)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw new Error(error.message);
        } else if (tokenHash && type) {
          const otpType = type as EmailOtpType;
          const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
          if (error) throw new Error(error.message);
        }

        const { data, error: userErr } = await supabase.auth.getUser();
        if (userErr || !data.user) {
          throw new Error("Session not established. Please open the invite link again.");
        }

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("id, email, main_role, onboarding_status, first_name, last_name")
          .eq("id", data.user.id)
          .single<ProfileRow>();

        if (profErr || !prof) throw new Error("Profile not found.");
        if (prof.main_role !== "admin") throw new Error("This onboarding link is for admins only.");

        // If already active, send them away
        if (prof.onboarding_status === "active") {
          router.replace("/dashboard/admin");
          return;
        }

        if (!cancelled) setProfile(prof);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Onboarding failed.";
        if (!cancelled) setFatal(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [code, tokenHash, type, supabase, router]);

  async function setPassword(): Promise<void> {
    if (saving || !canSubmit) return;

    setSaving(true);
    setFatal(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw new Error(error.message);

      // Best effort: mark onboarding active
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase
          .from("profiles")
          .update({ onboarding_status: "active", updated_at: new Date().toISOString() })
          .eq("id", u.user.id);
      }

      toast.success("Password set. Welcome!");
      router.replace("/dashboard/admin");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to set password.";
      setFatal(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] grid place-items-center bg-linear-to-br from-slate-50 via-white to-slate-50">
        <div className="w-full max-w-md px-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white shadow-xl shadow-slate-100/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
              <div className="h-6 w-40 bg-slate-200/70 rounded animate-pulse" />
              <div className="mt-2 h-4 w-64 bg-slate-200/60 rounded animate-pulse" />
            </div>
            <div className="p-6 space-y-3">
              <div className="h-10 bg-slate-200/60 rounded-xl animate-pulse" />
              <div className="h-10 bg-slate-200/60 rounded-xl animate-pulse" />
              <div className="h-10 bg-slate-200/60 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fatal || !profile) {
    return (
      <div className="min-h-[80vh] grid place-items-center bg-linear-to-br from-slate-50 via-white to-slate-50">
        <div className="w-full max-w-md px-6">
          <div className="rounded-3xl border border-rose-200 bg-white shadow-xl shadow-rose-100/40 overflow-hidden">
            <div className="p-6 bg-linear-to-r from-rose-50 to-white border-b border-rose-100">
              <h1 className="text-xl font-bold text-slate-900">Admin Onboarding</h1>
              <p className="text-sm text-slate-600 mt-1">We couldn’t complete onboarding.</p>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {fatal ?? "Unable to continue onboarding."}
              </div>
              <button
                type="button"
                onClick={() => router.replace("/login")}
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Go to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  const Req = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`} />
      <span className={ok ? "text-emerald-700 font-semibold" : "text-slate-600"}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-[90vh] bg-linear-to-br from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Top banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-linear-to-br from-purple-600 via-purple-700 to-indigo-600 p-8 text-white shadow-xl shadow-purple-200/30">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Admin Onboarding</h1>
              <p className="text-white/85 text-sm max-w-xl">
                Set a strong password to activate your admin account.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <UserRound className="h-4 w-4" />
                  {fullName || "Admin"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative h-10 w-36">
                <Image
                  src="/brand/logo.png"
                  alt="SYK Health Tech"
                  fill
                  sizes="144px"
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Left card */}
          <div className="lg:col-span-3 rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/60 overflow-hidden">
            <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-white p-6">
              <h2 className="text-lg font-bold text-slate-900">Set your password</h2>
              <p className="mt-1 text-sm text-slate-600">
                You’ll use this password to log in going forward.
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Password 1 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">New password</label>
                <div className="relative">
                  <input
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    type={showPw1 ? "text" : "password"}
                    placeholder="Enter a strong password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw1((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 hover:bg-slate-50"
                    aria-label="Toggle password visibility"
                  >
                    {showPw1 ? <EyeOff className="h-4 w-4 text-slate-600" /> : <Eye className="h-4 w-4 text-slate-600" />}
                  </button>
                </div>
              </div>

              {/* Password 2 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Confirm password</label>
                <div className="relative">
                  <input
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    type={showPw2 ? "text" : "password"}
                    placeholder="Re-enter password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 hover:bg-slate-50"
                    aria-label="Toggle password visibility"
                  >
                    {showPw2 ? <EyeOff className="h-4 w-4 text-slate-600" /> : <Eye className="h-4 w-4 text-slate-600" />}
                  </button>
                </div>
              </div>

              {/* Requirements */}
              <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-purple-700" />
                  <p className="text-sm font-semibold text-slate-900">Password rules</p>
                </div>
                <div className="mt-3 grid gap-1">
                  <Req ok={flags.len} label="At least 8 characters" />
                  <Req ok={flags.upper} label="At least 1 uppercase letter" />
                  <Req ok={flags.lower} label="At least 1 lowercase letter" />
                  <Req ok={flags.num} label="At least 1 number" />
                </div>

                {pwError ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    {pwError}
                  </div>
                ) : pw1.length > 0 && pw2.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    Looks good ✅
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void setPassword()}
                disabled={!canSubmit || saving}
                className="group w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Activate admin account"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Right side info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-100/60">
              <h3 className="text-sm font-bold text-slate-900">What happens next?</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>• You’ll be redirected to the Admin Dashboard.</p>
                <p>• Your profile status switches to <span className="font-semibold text-slate-900">active</span>.</p>
                <p>• You can manage staff, students, and records.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-100/60">
              <h3 className="text-sm font-bold text-slate-900">Security note</h3>
              <p className="mt-2 text-sm text-slate-600">
                Do not share this invite link. It’s intended for a single recipient.
              </p>

              <button
                type="button"
                onClick={() => void supabase.auth.signOut().then(() => router.replace("/login"))}
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
