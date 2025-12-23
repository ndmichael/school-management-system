"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Mail, UserPlus, ShieldCheck, Copy } from "lucide-react";

type InviteAdminResponse =
  | { success: true; email: string; invitedUserId: string; redirectTo: string; inviteQueued: true }
  | { error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

async function readJson(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  return res.json().catch(() => null);
}

export default function InviteAdminClient({ superAdminEmail }: { superAdminEmail: string }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const canInvite = useMemo(() => {
    const e = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email]);

  async function invite(): Promise<void> {
    if (!canInvite || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          email: email.trim(),
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
        }),
      });

      const raw = await readJson(res);
      const body: InviteAdminResponse =
        isRecord(raw) && (pickString(raw.error) || raw.success === true)
          ? (raw as InviteAdminResponse)
          : { error: `Request failed (${res.status})` };

      if (!res.ok) {
        const msg = "error" in body ? body.error : `Request failed (${res.status})`;
        throw new Error(msg);
      }

      if (!("success" in body) || body.success !== true) {
        throw new Error("Unexpected response.");
      }

      toast.success(`Invite sent to ${body.email}`);
      setEmail("");
      setFirstName("");
      setLastName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to invite admin");
    } finally {
      setLoading(false);
    }
  }

  async function copyPath(): Promise<void> {
    try {
      await navigator.clipboard.writeText("/dashboard/admin/super/invite");
      toast.success("Copied hidden path");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-linear-to-br from-purple-600 via-purple-700 to-indigo-600 p-7 text-white shadow-xl shadow-purple-200/30">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invite Admin</h1>
            <p className="mt-1 text-sm text-white/85">
              Super-admin only. Sends a secure Supabase invite link.
            </p>
            <p className="mt-3 text-xs text-white/80">
              Signed in as <span className="font-semibold">{superAdminEmail}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void copyPath()}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 border border-white/15"
              title="Copy hidden route"
            >
              <Copy className="h-4 w-4" />
              Copy path
            </button>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-100/60">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-purple-700" />
          <h2 className="text-lg font-bold text-slate-900">Admin details</h2>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 py-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-300"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">First name (optional)</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-300"
              placeholder="e.g. Ibrahim"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Last name (optional)</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-300"
              placeholder="e.g. Karaye"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setEmail("");
              setFirstName("");
              setLastName("");
            }}
            disabled={loading && !email}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => void invite()}
            disabled={!canInvite || loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <UserPlus className="h-4 w-4" />
            {loading ? "Sending invite…" : "Send invite"}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Invite emails redirect to <span className="font-semibold text-slate-700">/onboarding/admin</span>.
        </p>
      </div>
    </div>
  );
}
