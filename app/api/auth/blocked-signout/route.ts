import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_REASONS = new Set([
  "account_invalid",

  "student_suspended",
  "student_dismissed",
  "student_withdrawn",
  "student_graduated",
  "student_inactive",
  "student_record_missing",

  "staff_suspended",
  "staff_resigned",
  "staff_terminated",
  "staff_retired",
  "staff_inactive",
  "staff_record_missing",
]);

export async function GET(request: NextRequest) {
  const reasonParam =
    request.nextUrl.searchParams.get("reason");

  const reason =
    reasonParam && ALLOWED_REASONS.has(reasonParam)
      ? reasonParam
      : "account_invalid";

  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(
      "[BLOCKED_ACCOUNT_SIGNOUT_ERROR]",
      error,
    );
  }

  const loginUrl = new URL(
    "/login",
    request.nextUrl.origin,
  );

  loginUrl.searchParams.set("error", reason);

  return NextResponse.redirect(loginUrl);
}