import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("students")
    .select("program_id, department_id, level, course_session_id, status")
    .eq("id", studentId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ academic: data });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;

  const body = await req.json();

  const { error } = await supabaseAdmin
    .from("students")
    .update({
      program_id: body.program_id ?? null,
      department_id: body.department_id ?? null,
      level: body.level ?? null,
      course_session_id: body.course_session_id ?? null,
      status: body.status ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
