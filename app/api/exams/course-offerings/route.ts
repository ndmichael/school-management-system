import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireExamsAccess } from "@/lib/guards/requireExamsAccess";

export async function GET() {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { user } = guard;

  let query = supabaseAdmin
    .from("course_offerings")
    .select(`
      id,
      semester,
      level,
      is_published,
      courses ( code, title ),
      sessions ( name )
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // ─────────────────────────────────────────────
  // Academic staff → only offerings assigned to them
  // (Supabase DOES NOT support subqueries in .in())
  // ─────────────────────────────────────────────
  if (user.main_role === "academic_staff") {
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from("course_offering_staff")
      .select("course_offering_id")
      .eq("staff_id", user.id);

    if (assignErr) {
      return NextResponse.json({ error: assignErr.message }, { status: 400 });
    }

    const offeringIds = assignments.map(a => a.course_offering_id);

    // No assignments → return empty list safely
    if (offeringIds.length === 0) {
      return NextResponse.json({ offerings: [] });
    }

    query = query.in("id", offeringIds);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ offerings: data ?? [] });
}
