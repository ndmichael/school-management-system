import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(nextParam: string | null): string {
  // default
  if (!nextParam) return "/set-password";

  // only allow internal paths
  if (!nextParam.startsWith("/")) return "/set-password";
  if (nextParam.startsWith("//")) return "/set-password";
  return nextParam;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");

  const nextPath = safeNext(nextParam);

  if (!code) {
    return NextResponse.redirect(new URL(`/login`, url.origin));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/login`, url.origin));
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
