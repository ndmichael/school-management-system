import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CourseOfferingRow = {
  id: string;
  semester: string;
  program_id: string | null;
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
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
);

export async function GET() {
  try {
    // 1️⃣ Fetch offerings with proper FK joins (NOT arrays)
    const { data, error } = await supabase
      .from('course_offerings')
      .select(`
        id,
        semester,
        program_id,
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
        )
      `)
      .order('created_at', { ascending: false })
      .returns<CourseOfferingRow[]>();

    if (error) throw error;
    if (!data) return NextResponse.json([]);

    // 2️⃣ Compute counts (simple + MVP-safe)
    const results = await Promise.all(
      data.map(async (offering) => {
        // Eligible students
        let studentsQuery = supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('course_session_id', offering.session_id);

        if (offering.program_id) {
          studentsQuery = studentsQuery.eq('program_id', offering.program_id);
        }

        if (offering.level) {
          studentsQuery = studentsQuery.eq('level', offering.level);
        }

        const { count: eligible_students } = await studentsQuery;

        // Submitted results
        const { count: submitted_results } = await supabase
          .from('results')
          .select('id', { count: 'exact', head: true })
          .eq('course_offering_id', offering.id);

        // Assigned staff
        const { count: assigned_staff } = await supabase
          .from('course_offering_staff')
          .select('id', { count: 'exact', head: true })
          .eq('course_offering_id', offering.id);

        const pending_results =
          (eligible_students ?? 0) - (submitted_results ?? 0);

        return {
          course_offering_id: offering.id,
          course_code: offering.courses.code,
          course_title: offering.courses.title,
          credits: offering.courses.credits,
          session_name: offering.sessions.name,
          session_active: offering.sessions.is_active,
          semester: offering.semester,
          program_id: offering.program_id,
          level: offering.level,
          is_published: offering.is_published,
          eligible_students: eligible_students ?? 0,
          submitted_results: submitted_results ?? 0,
          pending_results,
          assigned_staff: assigned_staff ?? 0,
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Admin course-offerings error:', error);
    return NextResponse.json(
      { error: 'Failed to load course offerings' },
      { status: 500 }
    );
  }
}
