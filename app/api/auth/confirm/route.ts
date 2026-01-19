// app/api/auth/confirm/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

function safeNext(nextParam: string | null, fallback: string): string {
  if (!nextParam) return fallback;
  if (!nextParam.startsWith("/")) return fallback;
  if (nextParam.startsWith("//")) return fallback;
  return nextParam;
}

function isEmailOtpType(v: string | null): v is EmailOtpType {
  return (
    v === "invite" ||
    v === "recovery" ||
    v === "email" ||
    v === "signup" ||
    v === "magiclink"
  );
}

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next");

  const nextPath = safeNext(nextParam, "/set-password");

  if (!tokenHash || !isEmailOtpType(type)) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_link", url.origin)
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  /**
   * 🔑 CRITICAL FIX
   * This forces Supabase to WRITE the session cookie
   * before Next.js performs the redirect.
   */
  await supabase.auth.getSession();

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
