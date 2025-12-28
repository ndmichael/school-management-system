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
    v === "recovery" ||
    v === "invite" ||
    v === "email" ||
    v === "signup" ||
    v === "magiclink"
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next");

  // default behavior: if no next is provided, assume invite/set-password
  const nextPath = safeNext(nextParam, "/set-password");

  if (!tokenHash || !isEmailOtpType(typeParam)) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: typeParam,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
