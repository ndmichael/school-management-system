import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const ALLOWED_TYPES: ReadonlySet<EmailOtpType> = new Set<EmailOtpType>([
  "recovery",
  "invite",
  "email",
  "signup",
  "magiclink",
]);

function safeNextPath(requestUrl: string, nextParam: string | null): string {
  // Default based on type is handled in caller; here we only validate a next param.
  if (!nextParam) return "/";

  try {
    const reqUrl = new URL(requestUrl);
    const nextUrl = new URL(nextParam, reqUrl.origin);

    if (nextUrl.origin !== reqUrl.origin) return "/";
    const path = `${nextUrl.pathname}${nextUrl.search}`;
    return path.startsWith("/") ? path : "/";
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const token_hash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next");

  if (!token_hash || !typeParam) {
    return NextResponse.redirect(new URL("/auth/error?error=Invalid%20link", url.origin));
  }

  const otpType = typeParam as EmailOtpType;
  if (!ALLOWED_TYPES.has(otpType)) {
    return NextResponse.redirect(new URL("/auth/error?error=Invalid%20link%20type", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash });

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // If no next is provided, choose a sensible default based on type
  const defaultNext = otpType === "invite" ? "/auth/set-password" : "/auth/reset-password";
  const safeNext = nextParam ? safeNextPath(request.url, nextParam) : defaultNext;

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
