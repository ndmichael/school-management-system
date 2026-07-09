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
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "link_invalid_or_expired");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  await supabase.auth.getSession();

  return NextResponse.redirect(new URL(nextPath, url.origin));
}