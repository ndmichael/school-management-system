// app/api/student/enrollments/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudentAccess } from "@/lib/guards/requireStudentAccess";

type EnrollmentRow = {
  id: string;
  student_id: string;
  course_offering_id: string;
  enrolled_at: string;
  course_offerings: {
    id: string;
    course_id: string;
    session_id: string;
    semester: string;
    program_id: string | null;
    level: string | null;
    is_published: boolean;
  } | null;
};

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await requireStudentAccess();
  if ("error" in guard) return guard.error;

  const supabase = await createClient();
  const { user } = guard;

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim() ?? "";

  let q = supabase
    .from("enrollments")
    .select(
      `
      id,
      student_id,
      course_offering_id,
      enrolled_at,
      course_offerings:course_offering_id (
        id, course_id, session_id, semester, program_id, level, is_published
      )
    `
    )
    .eq("student_id", user.student_id)
    .order("enrolled_at", { ascending: false });

  if (sessionId) {
    q = q.eq("course_offerings.session_id", sessionId);
  }

  const { data, error } = await q.returns<EnrollmentRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ enrollments: data ?? [] });
}
