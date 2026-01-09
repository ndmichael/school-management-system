import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireExamsAccess } from "@/lib/guards/requireExamsAccess";

export async function POST(req: Request) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const {
    student_id,
    course_offering_id,
    ca_score,
    exam_score,
    total_score,
    grade_letter,
    grade_points,
    remark,
  } = await req.json();

  const { error } = await supabaseAdmin
    .from("results")
    .upsert(
      {
        student_id,
        course_offering_id,
        ca_score,
        exam_score,
        total_score,
        grade_letter,
        grade_points,
        remark,
        entered_by: guard.user.id,
      },
      { onConflict: "student_id,course_offering_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
