// app/api/student/enrollments/print/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudentAccess } from "@/lib/guards/requireStudentAccess";

/* ================= TYPES ================= */

type Semester = "first" | "second";

type ProfileRow = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
};

type StudentRow = {
  id: string;
  matric_no: string | null;
  program_id: string | null;
};

type ProgramRow = { name: string | null };

type SessionRow = {
  id: string;
  name: string | null;
};

type EnrolledOfferingRow = {
  course_code: string;
  course_title: string;
  credits: number;
  level: string | null;
};

type TotalsRow = {
  total_courses: number | null;
  total_credits: number | null;
};

/* ================= HELPERS ================= */

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function parseSemester(v: string | null): Semester | null {
  if (v === "first" || v === "second") return v;
  return null;
}

function fullName(p: ProfileRow | null): string {
  const parts = [p?.first_name, p?.middle_name, p?.last_name].filter(
    (x): x is string => Boolean(x && x.trim().length > 0)
  );
  return parts.length ? parts.join(" ") : "Student";
}

/* ================= ROUTE ================= */

export async function GET(req: Request) {
  const guard = await requireStudentAccess();
  if ("error" in guard) return guard.error;

  const supabase = await createClient();
  const { user } = guard;

  const url = new URL(req.url);
  const sessionId = (url.searchParams.get("session_id") ?? "").trim();
  const semester = parseSemester(url.searchParams.get("semester"));

  if (!sessionId || !isUuid(sessionId)) {
    return NextResponse.json(
      { error: "Missing/invalid session_id" },
      { status: 400 }
    );
  }
  if (!semester) {
    return NextResponse.json(
      { error: "Missing/invalid semester (first|second)" },
      { status: 400 }
    );
  }
  if (!user.student_id) {
    return NextResponse.json({ error: "Student not found" }, { status: 400 });
  }

  // Must be registered for the session (your existing rule)
  const { data: reg, error: regErr } = await supabase
    .from("student_registrations")
    .select("id")
    .eq("student_id", user.student_id)
    .eq("session_id", sessionId)
    .eq("status", "registered")
    .maybeSingle();

  if (regErr) {
    return NextResponse.json({ error: regErr.message }, { status: 400 });
  }
  if (!reg) {
    return NextResponse.json(
      { error: "Student is not registered for this session" },
      { status: 403 }
    );
  }

  // Student + profile + program + session (for print header)
  const [{ data: profile, error: pErr }, { data: student, error: sErr }, { data: session, error: sessErr }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, middle_name, last_name")
        .eq("id", user.profile_id)
        .maybeSingle<ProfileRow>(),
      supabase
        .from("students")
        .select("id, matric_no, program_id")
        .eq("id", user.student_id)
        .single<StudentRow>(),
      supabase
        .from("sessions")
        .select("id, name")
        .eq("id", sessionId)
        .single<SessionRow>(),
    ]);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });
  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 400 });

  const programName = (() => {
    if (!student.program_id) return null;
    return supabase
      .from("programs")
      .select("name")
      .eq("id", student.program_id)
      .maybeSingle<ProgramRow>();
  })();

  const programRes = programName ? await programName : null;
  const programLabel = programRes?.data?.name ?? "—";

  // Courses (VIEW)
  const { data: courses, error: cErr } = await supabase
    .from("v_student_enrolled_course_offerings")
    .select("course_code, course_title, credits, level")
    .eq("session_id", sessionId)
    .eq("semester", semester)
    .order("course_code", { ascending: true })
    .returns<EnrolledOfferingRow[]>();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

  // Totals (VIEW)
  const { data: totals, error: tErr } = await supabase
    .from("v_student_enrollment_totals")
    .select("total_courses, total_credits")
    .eq("session_id", sessionId)
    .eq("semester", semester)
    .maybeSingle<TotalsRow>();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });

  return NextResponse.json({
    student: {
      full_name: fullName(profile),
      matric_no: student.matric_no ?? "—",
      program_name: programLabel,
    },
    session: {
      id: session.id,
      name: session.name ?? "Session",
      semester,
    },
    courses: courses ?? [],
    totals: {
      total_courses: totals?.total_courses ?? (courses?.length ?? 0),
      total_credits:
        totals?.total_credits ??
        (courses ?? []).reduce((acc, r) => acc + (r.credits ?? 0), 0),
    },
  });
}
