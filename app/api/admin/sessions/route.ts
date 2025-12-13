import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id,name")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return json({ ok: false, error: error.message, code: error.code }, 400);
  }

  return json({ ok: true, sessions: data ?? [] });
}
