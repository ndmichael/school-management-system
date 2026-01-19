import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null;
}

function cleanEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return t ? t : null;
}

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";

  const isLocal = host.includes("localhost") || host.startsWith("127.0.0.1");
  const scheme = isLocal ? "http" : proto;

  return `${scheme}://${host}`;
}

type ProfileRow = {
  id: string;
  onboarding_status: string | null;
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = cleanEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Only allow resend if profile exists and is not already active.
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id,onboarding_status")
      .eq("email", email)
      .maybeSingle<ProfileRow>();

    if (profErr) {
      console.error("resend-invite profile lookup error:", profErr.message);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Avoid account enumeration
    if (!profile?.id) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if ((profile.onboarding_status ?? "").toLowerCase() === "active") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? getBaseUrl(req)).replace(/\/$/, "");
    const redirectTo = `${baseUrl}/api/auth/confirm`;

    // 1) Try invite (works if auth user not fully registered)
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { onboarding_status: "pending" },
    });

    // 2) Fallback to reset-password if user already exists
    if (inviteErr) {
      const m = inviteErr.message.toLowerCase();
      const isDup =
        m.includes("already registered") ||
        m.includes("already exists") ||
        m.includes("user already registered") ||
        m.includes("duplicate");

      if (isDup) {
        const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (resetErr) {
          console.error("resend reset fallback error:", resetErr.message);
        }
      } else {
        console.error("resend invite error:", inviteErr.message);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("resend-invite fatal:", err);
    // still return ok to avoid account enumeration
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
