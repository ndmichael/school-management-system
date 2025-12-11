import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* ============================================================
   GET ONE STUDENT (SAFE)
   ============================================================ */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("students")
    .select(
      `
        *,
        profiles:profile_id!left (*),
        programs:program_id!left (*),
        departments:department_id!left (*),
        sessions:course_session_id!left (*)
      `
    )
    .eq("id", studentId)
    .single();

  if (error) {
    console.error("GET /admin/students/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ student: data });
}

/* ============================================================
   UPDATE STUDENT
   ============================================================ */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("students")
    .update({
      level: body.level ?? null,
      program_id: body.program_id ?? null,
      department_id: body.department_id ?? null,
      course_session_id: body.course_session_id ?? null,

      guardian_first_name: body.guardian_first_name ?? null,
      guardian_last_name: body.guardian_last_name ?? null,
      guardian_phone: body.guardian_phone ?? null,
      guardian_status: body.guardian_status ?? null,

      status: body.status ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId)
    .select()
    .single();

  if (error) {
    console.error("PATCH /admin/students/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ student: data });
}

/* ============================================================
   SOFT DELETE STUDENT
   ============================================================ */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;

  const { error } = await supabaseAdmin
    .from("students")
    .update({
      status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) {
    console.error("DELETE /admin/students/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
