import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getBaseUrl, requireSuperAdmin } from "@/lib/auth/super-admin";

type InviteAdminBody = {
  email: string;
  first_name?: string;
  last_name?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function looksLikeEmail(email: string): boolean {
  // simple, pragmatic check (avoid rejecting valid but uncommon emails)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDuplicateAuthMessage(msg: string) {
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

  const first = cap(parts[0] ?? "Admin");
  const last = cap(parts[1] ?? "User");

  return { first, last };
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();

  if (!auth.ok) {
    // user missing => 401, user present but not allowlisted => 403
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bodyUnknown: unknown = await req.json().catch(() => null);
  if (!isRecord(bodyUnknown)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const emailRaw = typeof bodyUnknown.email === "string" ? bodyUnknown.email : "";
  const email = normalizeEmail(emailRaw);

  if (!email || !looksLikeEmail(email)) {
    return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
  }

  const firstNameRaw = typeof bodyUnknown.first_name === "string" ? bodyUnknown.first_name.trim() : "";
  const lastNameRaw = typeof bodyUnknown.last_name === "string" ? bodyUnknown.last_name.trim() : "";

  const fallback = safeNameFromEmail(email);
  const first_name = firstNameRaw || fallback.first;
  const last_name = lastNameRaw || fallback.last;

  // 1) Prevent duplicates in profiles table
  const { data: existingProfile, error: profCheckErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profCheckErr) {
    return NextResponse.json({ error: profCheckErr.message }, { status: 400 });
  }

  if (existingProfile?.id) {
    return NextResponse.json({ error: "Profile already exists for this email." }, { status: 409 });
  }

  // 2) Invite auth user
  const redirectTo = new URL("/onboarding/admin", getBaseUrl(req)).toString();

  const { data: inviteRes, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { onboarding_status: "pending", main_role: "admin" },
    redirectTo,
  });

  if (inviteErr) {
    const msg = inviteErr.message ?? "Failed to invite user.";
    const isDup = isDuplicateAuthMessage(msg);
    return NextResponse.json({ error: isDup ? "User already exists in auth." : msg }, { status: isDup ? 409 : 400 });
  }

  const invitedUserId = inviteRes?.user?.id;
  if (!invitedUserId) {
    return NextResponse.json({ error: "Invite succeeded but no user id returned." }, { status: 400 });
  }

  // 3) Create profile row (service role bypasses RLS)
  const now = new Date().toISOString();
  const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
    id: invitedUserId,
    first_name,
    middle_name: null,
    last_name,
    email,
    phone: null,
    date_of_birth: null,
    gender: null,
    nin: null,
    address: null,
    state_of_origin: null,
    lga_of_origin: null,
    religion: null,
    main_role: "admin",
    onboarding_status: "pending",
    avatar_file: null,
    created_at: now,
    updated_at: now,
  });

  if (profileErr) {
    // cleanup auth user to avoid “ghost user”
    await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    email,
    invitedUserId,
    redirectTo,
    inviteQueued: true,
  });
}
