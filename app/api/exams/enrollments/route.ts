import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireExamsAccess } from "@/lib/guards/requireExamsAccess";

export async function POST(req: Request) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { student_id, course_offering_id } = await req.json();

  const { error } = await supabaseAdmin
    .from("enrollments")
    .insert({ student_id, course_offering_id });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { student_id, course_offering_id } = await req.json();

  const { error } = await supabaseAdmin
    .from("enrollments")
    .delete()
    .eq("student_id", student_id)
    .eq("course_offering_id", course_offering_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
