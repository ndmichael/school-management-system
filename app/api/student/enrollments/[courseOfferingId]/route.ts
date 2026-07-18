import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudentAccess } from "@/lib/guards/requireStudentAccess";

type Semester = "first" | "second";

type RouteParams = {
  courseOfferingId: string;
};

type OfferingRow = {
  id: string;
  session_id: string;
  semester: string;
  is_published: boolean;
};

type RegistrationRow = {
  id: string;
  status: string;
};

type SessionRow = {
  id: string;
  start_date: string;
  end_date: string;
  registration_start_date: string | null;
  registration_end_date: string | null;
  current_semester: string | null;
  is_active: boolean | null;
};

type ProgramLinkRow = {
  course_offering_id: string;
};

function isSemester(value: unknown): value is Semester {
  return value === "first" || value === "second";
}

function getCurrentDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function validateSession(
  session: SessionRow,
  offering: OfferingRow
): NextResponse | null {
  if (!session.is_active) {
    return NextResponse.json(
      { error: "This academic session is not active." },
      { status: 403 }
    );
  }

  if (!isSemester(session.current_semester)) {
    return NextResponse.json(
      {
        error:
          "The active academic session does not have a valid current semester.",
      },
      { status: 409 }
    );
  }

  if (offering.semester !== session.current_semester) {
    return NextResponse.json(
      {
        error:
          "This course offering is not available in the current semester.",
      },
      { status: 403 }
    );
  }

  const registrationStart =
    session.registration_start_date ?? session.start_date;

  const registrationEnd =
    session.registration_end_date ?? session.end_date;

  const today = getCurrentDate();

  if (today < registrationStart) {
    return NextResponse.json(
      { error: "Course registration has not started." },
      { status: 403 }
    );
  }

  if (today > registrationEnd) {
    return NextResponse.json(
      { error: "Course registration has closed." },
      { status: 403 }
    );
  }

  return null;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<RouteParams> | RouteParams }
) {
  const guard = await requireStudentAccess();

  if ("error" in guard) {
    return guard.error;
  }

  const supabase = await createClient();
  const { user } = guard;

  const params = await ctx.params;
  const courseOfferingId =
    params.courseOfferingId?.trim() ?? "";

  if (!courseOfferingId) {
    return NextResponse.json(
      { error: "Missing courseOfferingId." },
      { status: 400 }
    );
  }

  if (!user.student_id || !user.program_id) {
    return NextResponse.json(
      { error: "Invalid student context." },
      { status: 400 }
    );
  }

  // 1. Offering must exist and be published.
  const { data: offering, error: offeringError } =
    await supabase
      .from("course_offerings")
      .select("id, session_id, semester, is_published")
      .eq("id", courseOfferingId)
      .eq("is_published", true)
      .maybeSingle<OfferingRow>();

  if (offeringError) {
    console.error(
      "Failed to load course offering:",
      offeringError
    );

    return NextResponse.json(
      { error: "Failed to verify the course offering." },
      { status: 500 }
    );
  }

  if (!offering) {
    return NextResponse.json(
      { error: "Course offering not found." },
      { status: 404 }
    );
  }

  // 2. Student must be registered for the offering's session.
  const { data: registration, error: registrationError } =
    await supabase
      .from("student_registrations")
      .select("id, status")
      .eq("student_id", user.student_id)
      .eq("session_id", offering.session_id)
      .eq("status", "registered")
      .maybeSingle<RegistrationRow>();

  if (registrationError) {
    console.error(
      "Failed to verify student registration:",
      registrationError
    );

    return NextResponse.json(
      { error: "Failed to verify session registration." },
      { status: 500 }
    );
  }

  if (!registration) {
    return NextResponse.json(
      {
        error:
          "You are not registered for this academic session.",
      },
      { status: 403 }
    );
  }

  // 3. Check session, semester and registration dates.
  const { data: session, error: sessionError } =
    await supabase
      .from("sessions")
      .select(`
        id,
        start_date,
        end_date,
        registration_start_date,
        registration_end_date,
        current_semester,
        is_active
      `)
      .eq("id", offering.session_id)
      .maybeSingle<SessionRow>();

  if (sessionError) {
    console.error(
      "Failed to load academic session:",
      sessionError
    );

    return NextResponse.json(
      { error: "Failed to verify the academic session." },
      { status: 500 }
    );
  }

  if (!session) {
    return NextResponse.json(
      { error: "Academic session not found." },
      { status: 404 }
    );
  }

  const sessionErrorResponse = validateSession(
    session,
    offering
  );

  if (sessionErrorResponse) {
    return sessionErrorResponse;
  }

  // 4. Offering must be assigned to the student's programme.
  const { data: programLink, error: programLinkError } =
    await supabase
      .from("course_offering_programs")
      .select("course_offering_id")
      .eq("course_offering_id", courseOfferingId)
      .eq("program_id", user.program_id)
      .maybeSingle<ProgramLinkRow>();

  if (programLinkError) {
    console.error(
      "Failed to verify programme eligibility:",
      programLinkError
    );

    return NextResponse.json(
      { error: "Failed to verify programme eligibility." },
      { status: 500 }
    );
  }

  if (!programLink) {
    return NextResponse.json(
      {
        error:
          "You are not eligible for this course offering.",
      },
      { status: 403 }
    );
  }

  // 5. Unique(student_id, course_offering_id) prevents duplicates.
  const { error: enrollmentError } = await supabase
    .from("enrollments")
    .insert({
      student_id: user.student_id,
      course_offering_id: courseOfferingId,
    });

  if (enrollmentError) {
    if (enrollmentError.code === "23505") {
      return NextResponse.json({
        ok: true,
        already_enrolled: true,
      });
    }

    console.error(
      "Failed to create enrollment:",
      enrollmentError
    );

    return NextResponse.json(
      { error: "Failed to register for the course." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      already_enrolled: false,
    },
    { status: 201 }
  );
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<RouteParams> | RouteParams }
) {
  const guard = await requireStudentAccess();

  if ("error" in guard) {
    return guard.error;
  }

  const supabase = await createClient();
  const { user } = guard;

  const params = await ctx.params;
  const courseOfferingId =
    params.courseOfferingId?.trim() ?? "";

  if (!courseOfferingId) {
    return NextResponse.json(
      { error: "Missing courseOfferingId." },
      { status: 400 }
    );
  }

  if (!user.student_id) {
    return NextResponse.json(
      { error: "Invalid student context." },
      { status: 400 }
    );
  }

  // 1. Read the offering so its session can be checked.
  const { data: offering, error: offeringError } =
    await supabase
      .from("course_offerings")
      .select("id, session_id, semester, is_published")
      .eq("id", courseOfferingId)
      .maybeSingle<OfferingRow>();

  if (offeringError) {
    console.error(
      "Failed to load course offering:",
      offeringError
    );

    return NextResponse.json(
      { error: "Failed to verify the course offering." },
      { status: 500 }
    );
  }

  if (!offering) {
    return NextResponse.json(
      { error: "Course offering not found." },
      { status: 404 }
    );
  }

  // 2. Read and validate the academic session.
  const { data: session, error: sessionError } =
    await supabase
      .from("sessions")
      .select(`
        id,
        start_date,
        end_date,
        registration_start_date,
        registration_end_date,
        current_semester,
        is_active
      `)
      .eq("id", offering.session_id)
      .maybeSingle<SessionRow>();

  if (sessionError) {
    console.error(
      "Failed to load academic session:",
      sessionError
    );

    return NextResponse.json(
      { error: "Failed to verify the academic session." },
      { status: 500 }
    );
  }

  if (!session) {
    return NextResponse.json(
      { error: "Academic session not found." },
      { status: 404 }
    );
  }

  const sessionErrorResponse = validateSession(
    session,
    offering
  );

  if (sessionErrorResponse) {
    return sessionErrorResponse;
  }

  // 3. Delete only the authenticated student's enrollment.
  const { error: deleteError } = await supabase
    .from("enrollments")
    .delete()
    .eq("student_id", user.student_id)
    .eq("course_offering_id", courseOfferingId);

  if (deleteError) {
    console.error(
      "Failed to remove enrollment:",
      deleteError
    );

    return NextResponse.json(
      { error: "Failed to remove the course." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}