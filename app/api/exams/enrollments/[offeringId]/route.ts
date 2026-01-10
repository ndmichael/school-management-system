import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireExamsAccess } from "@/lib/guards/requireExamsAccess";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ offeringId: string }> }
) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { offeringId } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select(
      `
      id,
      students (
        id,
        matric_no,
        profiles (
          first_name,
          last_name
        )
      )
    `
    )
    .eq("course_offering_id", offeringId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ roster: data ?? [] });
}
