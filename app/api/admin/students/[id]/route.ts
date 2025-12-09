import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ============ GET ONE STUDENT ============
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const studentId = params.id;

  const { data, error } = await supabaseAdmin
    .from("students")
    .select(
      `
        *,
        profiles (*),
        programs:program_id (*),
        departments:department_id (*),
        sessions:session_id (*)
      `
    )
    .eq("id", studentId)
    .single();

  if (error) {
    console.error("GET /admin/students/:id error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ student: data });
}

// ============ UPDATE STUDENT ============
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const studentId = params.id;
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("students")
    .update({
      level: body.level,
      program_id: body.program_id,
      department_id: body.department_id,
      session_id: body.session_id, // FIXED from course_session_id
      guardian_first_name: body.guardian_first_name,
      guardian_last_name: body.guardian_last_name,
      guardian_phone: body.guardian_phone,
      guardian_status: body.guardian_status,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId)
    .select()
    .single();

  if (error) {
    console.error("PATCH /admin/students/:id error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ student: data });
}



// ============ SOFT DELETE STUDENT ============
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const studentId = params.id;

  const { error } = await supabaseAdmin
    .from("students")
    .update({
      status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) {
    console.error("DELETE /admin/students/:id error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
