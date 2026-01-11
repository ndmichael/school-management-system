import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireExamsAccess } from "@/lib/guards/requireExamsAccess";

type Params = { courseOfferingId: string };

type StudentProfile = {
  first_name: string;
  last_name: string;
};

type EligibleStudent = {
  id: string;
  matric_no: string;
  profiles: StudentProfile; // single object (what your UI expects)
};

type DbStudentRow = {
  id: string;
  matric_no: string;
  profiles: StudentProfile[] | null; // Supabase returns relation as array
};

type OfferingScope = {
  id: string;
  program_id: string;
  session_id: string;
  level: string | null;
};

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { courseOfferingId } = await ctx.params;

  // 1) Load offering scope (program + session, level optional)
  const { data: offering, error: offeringErr } = await supabaseAdmin
    .from("course_offerings")
    .select("id, program_id, session_id, level")
    .eq("id", courseOfferingId)
    .single<OfferingScope>();

  if (offeringErr || !offering) {
    return NextResponse.json(
      { error: "Course offering not found" },
      { status: 404 }
    );
  }

  // 2) Fetch already-enrolled student IDs for this offering
  const { data: enrolled, error: enrolledErr } = await supabaseAdmin
    .from("enrollments")
    .select("student_id")
    .eq("course_offering_id", courseOfferingId);

  if (enrolledErr) {
    return NextResponse.json({ error: enrolledErr.message }, { status: 400 });
  }

  const enrolledIds = (enrolled ?? [])
    .map((e) => e.student_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  // 3) Build eligible students query:
  // - program_id must match
  // - students.course_session_id must match offerings.session_id
  // - level optional
  // - students must be active
  // - exclude already enrolled
  let query = supabaseAdmin
    .from("students")
    .select(
      `
      id,
      matric_no,
      profiles (
        first_name,
        last_name
      )
    `
    )
    .eq("program_id", offering.program_id)
    .eq("course_session_id", offering.session_id)
    .eq("status", "active");

  if (offering.level !== null) {
    query = query.eq("level", offering.level);
  }

  if (enrolledIds.length > 0) {
    query = query.not("id", "in", `(${enrolledIds.join(",")})`);
  }

  const { data: rows, error: studentsErr } = await query;

  if (studentsErr) {
    return NextResponse.json({ error: studentsErr.message }, { status: 400 });
  }

  // 4) Normalize profiles[] -> profiles (single object) to match your UI contract
  const students: EligibleStudent[] = ((rows ?? []) as unknown as DbStudentRow[])
    .map((r) => {
      const p = r.profiles?.[0];
      if (!p) return null;

      return {
        id: r.id,
        matric_no: r.matric_no,
        profiles: {
          first_name: p.first_name,
          last_name: p.last_name,
        },
      };
    })
    .filter((x): x is EligibleStudent => x !== null);

  return NextResponse.json({ students });
}
