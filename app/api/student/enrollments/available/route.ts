import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudentAccess } from "@/lib/guards/requireStudentAccess";

type Semester = "first" | "second";

type SessionView = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
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

type ProgramLinkRow = {
  course_offering_id: string;
};

type NormalizedOffering = {
  id: string;
  semester: string;
  level: string | null;
  session: SessionView;
  course: CourseView;
  lecturers: LecturerView[];
};

function isSemester(value: unknown): value is Semester {
  return value === "first" || value === "second";
}

function getCurrentDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export async function GET(req: Request) {
  const guard = await requireStudentAccess();

  if ("error" in guard) {
    return guard.error;
  }

  const supabase = await createClient();
  const { user } = guard;

  const sessionId =
    new URL(req.url).searchParams.get("session_id")?.trim() ?? "";

  if (!sessionId) {
    return NextResponse.json({
      offerings: [] as NormalizedOffering[],
    });
  }

  if (!user.student_id || !user.program_id) {
    return NextResponse.json(
      { error: "Invalid student context." },
      { status: 400 }
    );
  }

  /*
   * 1. Confirm that the student is registered
   * for the selected academic session.
   */
  const { data: registration, error: registrationError } =
    await supabase
      .from("student_registrations")
      .select("id")
      .eq("student_id", user.student_id)
      .eq("session_id", sessionId)
      .eq("status", "registered")
      .maybeSingle<{ id: string }>();

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
    return NextResponse.json({
      offerings: [] as NormalizedOffering[],
    });
  }

  /*
   * 2. Read the session configuration.
   */
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      `
      id,
      start_date,
      end_date,
      registration_start_date,
      registration_end_date,
      current_semester,
      is_active
    `
    )
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();

  if (sessionError) {
    console.error("Failed to load academic session:", sessionError);

    return NextResponse.json(
      { error: "Failed to load the academic session." },
      { status: 500 }
    );
  }

  if (!session) {
    return NextResponse.json(
      { error: "Academic session not found." },
      { status: 404 }
    );
  }

  if (!session.is_active) {
    return NextResponse.json({
      offerings: [] as NormalizedOffering[],
    });
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

  /*
   * 3. Check the registration window.
   * Optional registration dates fall back to session dates.
   */
  const registrationStart =
    session.registration_start_date ?? session.start_date;

  const registrationEnd =
    session.registration_end_date ?? session.end_date;

  const today = getCurrentDate();

  if (today < registrationStart || today > registrationEnd) {
    return NextResponse.json({
      offerings: [] as NormalizedOffering[],
    });
  }

  /*
   * 4. Find offerings assigned to the student's programme.
   * course_offering_programs is the confirmed source of truth.
   */
  const { data: programLinks, error: programLinksError } =
    await supabase
      .from("course_offering_programs")
      .select("course_offering_id")
      .eq("program_id", user.program_id)
      .returns<ProgramLinkRow[]>();

  if (programLinksError) {
    console.error(
      "Failed to load programme course offerings:",
      programLinksError
    );

    return NextResponse.json(
      { error: "Failed to load available course offerings." },
      { status: 500 }
    );
  }

  const eligibleOfferingIds = [
    ...new Set(
      (programLinks ?? []).map(
        (link) => link.course_offering_id
      )
    ),
  ];

  if (eligibleOfferingIds.length === 0) {
    return NextResponse.json({
      offerings: [] as NormalizedOffering[],
    });
  }

  /*
   * 5. Return published offerings for the current semester
   * that are assigned to the student's programme.
   *
   * Level is intentionally not enforced because it is optional
   * and courses can be shared across levels.
   */
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
    .eq("semester", session.current_semester)
    .eq("is_published", true)
    .in("course_offering_id", eligibleOfferingIds)
    .returns<OfferingViewRow[]>();

  if (error) {
    console.error("Failed to load available offerings:", error);

    return NextResponse.json(
      { error: "Failed to load available course offerings." },
      { status: 500 }
    );
  }

  const offerings: NormalizedOffering[] = (data ?? []).map(
    (row) => ({
      id: row.course_offering_id,
      semester: row.semester,
      level: row.level,
      session: row.session,
      course: row.course,
      lecturers: row.lecturers ?? [],
    })
  );

  return NextResponse.json({ offerings });
}