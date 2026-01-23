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

  const body = (await req.json().catch(() => null)) as { enrollment_id?: string } | null;
  const enrollment_id = typeof body?.enrollment_id === "string" ? body.enrollment_id : "";

  if (!enrollment_id) {
    return NextResponse.json({ error: "enrollment_id is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("enrollments").delete().eq("id", enrollment_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

