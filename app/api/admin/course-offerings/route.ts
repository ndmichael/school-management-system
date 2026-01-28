import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CourseOfferingRow = {
  id: string;
  semester: string;
  level: string | null;
  is_published: boolean;
  course_id: string;
  session_id: string;
  courses: {
    code: string;
    title: string;
    credits: number;
  };
  sessions: {
    name: string;
    is_active: boolean;
  };
  course_offering_programs: {
    programs: {
      id: string;
      name: string;
    };
  }[];
};

type ProgramItem = { id: string; name: string };

type ApiRow = {
  course_offering_id: string;
  course_code: string;
  course_title: string;
  credits: number;
  session_name: string;
  session_active: boolean;
  semester: string;
  programs: ProgramItem[];
  program_count: number;
  level: string | null;
  is_published: boolean;
  eligible_students: number;
  submitted_results: number;
  pending_results: number;
  assigned_staff: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("course_offerings")
      .select(`
        id,
        semester,
        level,
        is_published,
        course_id,
        session_id,
        courses!inner (
          code,
          title,
          credits
        ),
        sessions!inner (
          name,
          is_active
        ),
        course_offering_programs (
          programs (
            id,
            name
          )
        )
      `)
      .order("created_at", { ascending: false })
      .returns<CourseOfferingRow[]>();

    if (error) throw error;
    if (!data) return NextResponse.json<ApiRow[]>([]);

    const results: ApiRow[] = await Promise.all(
      data.map(async (offering) => {
        const programs: ProgramItem[] =
          offering.course_offering_programs?.map((p) => ({
            id: p.programs.id,
            name: p.programs.name,
          })) ?? [];

        // ✅ Eligible students = enrollments for THIS offering
        const { count: eligibleCount, error: eligErr } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("course_offering_id", offering.id);

        if (eligErr) throw eligErr;

        const { count: submittedCount, error: resErr } = await supabase
          .from("results")
          .select("id", { count: "exact", head: true })
          .eq("course_offering_id", offering.id);

        if (resErr) throw resErr;

        const { count: staffCount, error: staffErr } = await supabase
          .from("course_offering_staff")
          .select("id", { count: "exact", head: true })
          .eq("course_offering_id", offering.id);

        if (staffErr) throw staffErr;

        const eligible_students = eligibleCount ?? 0;
        const submitted_results = submittedCount ?? 0;

        return {
          course_offering_id: offering.id,
          course_code: offering.courses.code,
          course_title: offering.courses.title,
          credits: offering.courses.credits,
          session_name: offering.sessions.name,
          session_active: offering.sessions.is_active,
          semester: offering.semester,
          programs,
          program_count: programs.length,
          level: offering.level,
          is_published: offering.is_published,
          eligible_students,
          submitted_results,
          pending_results: Math.max(eligible_students - submitted_results, 0),
          assigned_staff: staffCount ?? 0,
        };
      })
    );

    return NextResponse.json<ApiRow[]>(results);
  } catch (error) {
    console.error("Admin course-offerings error:", error);
    return NextResponse.json(
      { error: "Failed to load course offerings" },
      { status: 500 }
    );
  }
}
