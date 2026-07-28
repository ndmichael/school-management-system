import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  /*
   * Prevent excessively large responses while still allowing
   * the caller to request more than the default number.
  */
  const requestedLimit = Number(
    searchParams.get("limit") ?? 50,
  );

  const limit = Math.min(
    Math.max(
      Number.isFinite(requestedLimit)
        ? requestedLimit
        : 50,
      1,
    ),
    200,
  );

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(`
      id,
      name,
      start_date,
      end_date,
      is_active,
      current_semester
    `)

    /*
     * The single active session appears first.
     * Remaining sessions are ordered by their starting date.
     */
    .order("is_active", { ascending: false })
    .order("start_date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error(
      "GET /api/admin/sessions error:",
      error,
    );

    return json(
      {
        ok: false,
        error: error.message,
        code: error.code,
      },
      400,
    );
  }

  return json({
    ok: true,
    sessions: data ?? [],
  });
}
