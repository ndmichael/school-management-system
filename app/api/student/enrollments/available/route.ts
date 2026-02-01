import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudentAccess } from "@/lib/guards/requireStudentAccess";

/* ================= TYPES ================= */

type SessionView = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type CourseView = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number | null;
};

type LecturerView = {
  id: string;
  name: string;
};

type OfferingViewRow = {
  course_offering_id: string;
  session_id: string;
  semester: string;
  level: string | null;
  is_published: boolean;
  session: SessionView;
  course: CourseView;
  lecturers: LecturerView[];
};

type NormalizedOffering = {
  id: string;
  semester: string;
  level: string | null;
  session: SessionView;
  course: CourseView;
  lecturers: LecturerView[];
};

/* ================= ROUTE ================= */

export async function GET(req: Request) {
  const guard = await requireStudentAccess();
  if ("error" in guard) return guard.error;

  const supabase = await createClient();
  const { user } = guard;

  const sessionId =
    new URL(req.url).searchParams.get("session_id")?.trim() ?? "";

  if (!sessionId) {
    return NextResponse.json({ offerings: [] as NormalizedOffering[] });
  }

  if (!user.student_id || !user.program_id) {
    return NextResponse.json(
      { error: "Invalid student context." },
      { status: 400 }
    );
  }

  /* 1️⃣ Must be registered for the session */
  const { data: registration, error: regErr } = await supabase
    .from("student_registrations")
    .select("id")
    .eq("student_id", user.student_id)
    .eq("session_id", sessionId)
    .eq("status", "registered")
    .maybeSingle();

  if (regErr) {
    return NextResponse.json({ error: regErr.message }, { status: 400 });
  }

  if (!registration) {
    return NextResponse.json({ offerings: [] as NormalizedOffering[] });
  }

  /* 2️⃣ Read from the SQL view (RLS-safe) */
  const { data, error } = await supabase
    .from("student_available_course_offerings")
    .select(
      `
      course_offering_id,
      session_id,
      semester,
      level,
      is_published,
      session,
      course,
      lecturers
    `
    )
    .eq("session_id", sessionId)
    .eq("is_published", true)
    .returns<OfferingViewRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  /* 3️⃣ Normalize to UI contract */
  const offerings: NormalizedOffering[] = (data ?? []).map((row) => ({
    id: row.course_offering_id,
    semester: row.semester,
    level: row.level,
    session: row.session,
    course: row.course,
    lecturers: row.lecturers,
  }));

  return NextResponse.json({ offerings });
}
