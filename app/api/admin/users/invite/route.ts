import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getBaseUrl, requireSuperAdmin } from "@/lib/auth/super-admin";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null;
}

function pickString(obj: JsonRecord, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDuplicateAuthMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already registered") ||
    m.includes("duplicate")
  );
}

function safeNameFromEmail(email: string): { first: string; last: string } {
  const local = email.split("@")[0] ?? "admin";
  const parts = local.split(/[._-]+/).filter(Boolean);

  const cap = (s: string) => (s.length ? s[0].toUpperCase() + s.slice(1) : s);

  return {
    first: cap(parts[0] ?? "Admin"),
    last: cap(parts[1] ?? "User"),
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bodyUnknown: unknown = await req.json().catch(() => null);
  if (!isRecord(bodyUnknown)) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = normalizeEmail(pickString(bodyUnknown, "email"));
  if (!email || !looksLikeEmail(email)) {
    return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
  }

  const firstNameRaw = pickString(bodyUnknown, "first_name");
  const lastNameRaw = pickString(bodyUnknown, "last_name");

  const fallback = safeNameFromEmail(email);
  const first_name = firstNameRaw || fallback.first;
  const last_name = lastNameRaw || fallback.last;

  // 1) Prevent duplicate profile (by email)
  const { data: existingProfile, error: profCheckErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle<{ id: string }>();

  if (profCheckErr) return NextResponse.json({ error: profCheckErr.message }, { status: 400 });
  if (existingProfile?.id) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  // 2) INVITE auth user (token_hash flow)
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? getBaseUrl(req)).replace(/\/$/, "");
  const redirectTo = `${baseUrl}/api/auth/confirm`;

  const { data: inviteRes, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { onboarding_status: "pending", main_role: "admin" },
  });

  if (inviteErr) {
    const msg = inviteErr.message ?? "Invite failed";
    const isDup = isDuplicateAuthMessage(msg);
    return NextResponse.json(
      { error: isDup ? "User already exists in auth (delete them or use a different email)." : msg },
      { status: isDup ? 409 : 400 }
    );
  }

  const invitedUserId = inviteRes?.user?.id ?? null;
  if (!invitedUserId) {
    return NextResponse.json({ error: "Auth invite failed (no user id)" }, { status: 400 });
  }

  // 3) Create profile (keep onboarding_status pending)
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: invitedUserId,
      first_name,
      middle_name: null,
      last_name,
      email,
      phone: null,
      gender: null,
      date_of_birth: null,
      nin: null,
      address: null,
      state_of_origin: null,
      lga_of_origin: null,
      religion: null,
      main_role: "admin",
      onboarding_status: "pending",
      avatar_file: null,
    })
    .select("id")
    .single<{ id: string }>();

  if (profileErr || !profile) {
    await supabaseAdmin.auth.admin.deleteUser(invitedUserId).catch(() => null);
    return NextResponse.json({ error: profileErr?.message ?? "Failed to create profile" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    email,
    invitedUserId,
    inviteQueued: true,
    redirectTo,
  });
}
