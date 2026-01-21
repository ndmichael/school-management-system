import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireExamsAccess } from "@/lib/guards/requireExamsAccess";

type Params = { courseOfferingId: string };

type StudentProfile = {
  first_name: string;
  last_name: string;
};

type EligibleStudent = {
  id: string; // students.id
  matric_no: string;
  profiles: StudentProfile; // UI expects single object
};

type OfferingScope = {
  id: string;
  session_id: string;
  level: string | null;
};

type OfferingProgramRow = { program_id: string };

type EnrollmentRow = { student_id: string };

type RegistrationJoinRow = {
  student_id: string;
  students: {
    id: string;
    matric_no: string;
    status: string | null;
    program_id: string | null;
    profiles: StudentProfile | null;
  } | null;
};

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { courseOfferingId } = await ctx.params;

  // 1) offering scope (session + optional level)
  const { data: offering, error: offeringErr } = await supabaseAdmin
    .from("course_offerings")
    .select("id, session_id, level")
    .eq("id", courseOfferingId)
    .single<OfferingScope>();

  if (offeringErr || !offering) {
    return NextResponse.json({ error: "Course offering not found" }, { status: 404 });
  }

  // 2) programs attached to offering (M2M)
  const { data: offeringPrograms, error: progErr } = await supabaseAdmin
    .from("course_offering_programs")
    .select("program_id")
    .eq("course_offering_id", courseOfferingId);

  if (progErr) {
    return NextResponse.json({ error: progErr.message }, { status: 400 });
  }

  const programIds = (offeringPrograms ?? [])
    .map((r: OfferingProgramRow) => r.program_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (programIds.length === 0) {
    return NextResponse.json({ students: [] });
  }

  // 3) already enrolled students in this offering
  const { data: enrolled, error: enrolledErr } = await supabaseAdmin
    .from("enrollments")
    .select("student_id")
    .eq("course_offering_id", courseOfferingId)
    .returns<EnrollmentRow[]>();

  if (enrolledErr) {
    return NextResponse.json({ error: enrolledErr.message }, { status: 400 });
  }

  const enrolledIds = (enrolled ?? [])
    .map((e) => e.student_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  // 4) registrations for the offering's session (+ optional level), joined to students + profiles
  // NOTE: profiles join is forced via FK name students_profile_id_fkey
  let regQuery = supabaseAdmin
    .from("student_registrations")
    .select(
      `
      student_id,
      students!inner (
        id,
        matric_no,
        status,
        program_id,
        profiles!students_profile_id_fkey (
          first_name,
          last_name
        )
      )
    `
    )
    .eq("session_id", offering.session_id)
    .eq("status", "registered");

  if (offering.level !== null) {
    regQuery = regQuery.eq("level", offering.level);
  }

  const { data: regRows, error: regErr } = await regQuery.returns<RegistrationJoinRow[]>();

  if (regErr) {
    return NextResponse.json({ error: regErr.message }, { status: 400 });
  }

  // 5) filter: active + program match + not enrolled + has profile
  const students: EligibleStudent[] = (regRows ?? [])
    .map((r) => r.students)
    .filter((s): s is NonNullable<RegistrationJoinRow["students"]> => s !== null)
    .filter((s) => s.status === "active")
    .filter((s) => typeof s.program_id === "string" && programIds.includes(s.program_id))
    .filter((s) => !enrolledIds.includes(s.id))
    .map((s) => {
      const p = s.profiles;
      if (!p) return null;
      return {
        id: s.id,
        matric_no: s.matric_no,
        profiles: { first_name: p.first_name, last_name: p.last_name },
      };
    })
    .filter((x): x is EligibleStudent => x !== null);

  return NextResponse.json({ students });
}
