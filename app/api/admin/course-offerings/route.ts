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
    if (!data) return NextResponse.json([]);

    const results = await Promise.all(
      data.map(async (offering) => {
        const programs =
          offering.course_offering_programs?.map((p) => ({
            id: p.programs.id,
            name: p.programs.name,
          })) ?? [];

        let studentsQuery = supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("course_session_id", offering.session_id);

        if (programs.length > 0) {
          studentsQuery = studentsQuery.in(
            "program_id",
            programs.map((p) => p.id)
          );
        }

        if (offering.level) {
          studentsQuery = studentsQuery.eq("level", offering.level);
        }

        const { count: eligible_students } = await studentsQuery;

        const { count: submitted_results } = await supabase
          .from("results")
          .select("id", { count: "exact", head: true })
          .eq("course_offering_id", offering.id);

        const { count: assigned_staff } = await supabase
          .from("course_offering_staff")
          .select("id", { count: "exact", head: true })
          .eq("course_offering_id", offering.id);

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
          eligible_students: eligible_students ?? 0,
          submitted_results: submitted_results ?? 0,
          pending_results:
            (eligible_students ?? 0) - (submitted_results ?? 0),
          assigned_staff: assigned_staff ?? 0,
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Admin course-offerings error:", error);
    return NextResponse.json(
      { error: "Failed to load course offerings" },
      { status: 500 }
    );
  }
}
