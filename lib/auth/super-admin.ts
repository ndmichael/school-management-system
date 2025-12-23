import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => normalizeEmail(s))
    .filter((s) => s.length > 0);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = getSuperAdminEmails();
  if (allow.length === 0) return false;
  return allow.includes(normalizeEmail(email));
}

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false as const, supabase, user: null as User | null };
  }

  return { ok: true as const, supabase, user: data.user };
}

export async function requireSuperAdmin() {
  const base = await requireUser();
  if (!base.ok) return { ok: false as const, supabase: base.supabase, user: null as User | null };

  const email = base.user.email ?? null;
  if (!isSuperAdminEmail(email)) {
    return { ok: false as const, supabase: base.supabase, user: base.user };
  }

  return { ok: true as const, supabase: base.supabase, user: base.user };
}

export function getBaseUrl(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";

  if (!host) return "http://localhost:3000";
  const isLocal = host.includes("localhost") || host.startsWith("127.0.0.1");
  const scheme = isLocal ? "http" : proto;

  return `${scheme}://${host}`;
}
