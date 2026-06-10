import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface AcademicUpdateBody {
  matric_no?: unknown;
  program_id?: unknown;
  department_id?: unknown;
  admission_session_id?: unknown;
  enrollment_date?: unknown;
  sponsorship_type?: unknown;
  student_status?: unknown;
  level?: unknown;
  registration_status?: unknown;
}

interface AcademicOption {
  id: string;
  name: string;
}

interface CurrentRegistration {
  id: string;
  level: string | null;
  status: string;
  session_id: string;
}

const ALLOWED_STUDENT_STATUSES = new Set([
  "active",
  "suspended",
  "graduated",
]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseNullableUuid(
  value: unknown,
  fieldName: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value !== "string" || !isUuid(value)) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return value;
}

function parseRequiredText(
  value: unknown,
  fieldName: string,
  maxLength = 100,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim().slice(0, maxLength);
}

function parseNullableText(
  value: unknown,
  maxLength = 100,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized
    ? normalized.slice(0, maxLength)
    : null;
}

function parseNullableDate(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error(
      "Enrollment date must use YYYY-MM-DD format.",
    );
  }

  return value;
}

async function verifyAdministrator(): Promise<
  | {
      authorized: true;
      profileId: string;
    }
  | {
      authorized: false;
      response: NextResponse;
    }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, main_role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Academic administrator verification error:",
      profileError,
    );

    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Failed to verify administrator." },
        { status: 500 },
      ),
    };
  }

  const allowedRoles = new Set([
    "admin",
    "administrator",
    "super_admin",
  ]);

  if (
    !profile ||
    !allowedRoles.has(String(profile.main_role))
  ) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error:
            "You are not allowed to edit academic information.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    authorized: true,
    profileId: profile.id,
  };
}

async function getActiveSession() {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load active session: ${error.message}`,
    );
  }

  return data;
}

/* ------------------------------------------------ */
/* GET ACADEMIC INFORMATION                         */
/* ------------------------------------------------ */

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id: studentId } = await context.params;

    if (!isUuid(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID." },
        { status: 400 },
      );
    }

    const authorization = await verifyAdministrator();

    if (!authorization.authorized) {
      return authorization.response;
    }

    const activeSession = await getActiveSession();

    const [
      studentResult,
      programsResult,
      departmentsResult,
      sessionsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("students")
        .select(`
          id,
          matric_no,
          program_id,
          department_id,
          admission_session_id,
          enrollment_date,
          sponsorship_type,
          status,

          student_registrations (
            id,
            level,
            status,
            session_id
          )
        `)
        .eq("id", studentId)
        .is("archived_at", null)
        .maybeSingle(),

      supabaseAdmin
        .from("programs")
        .select("id, name")
        .order("name", { ascending: true }),

      supabaseAdmin
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true }),

      supabaseAdmin
        .from("sessions")
        .select("id, name")
        .order("start_date", { ascending: false }),
    ]);

    if (studentResult.error) {
      console.error(
        "Academic student load error:",
        studentResult.error,
      );

      return NextResponse.json(
        { error: studentResult.error.message },
        { status: 400 },
      );
    }

    if (!studentResult.data) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );
    }

    const optionsError =
      programsResult.error ??
      departmentsResult.error ??
      sessionsResult.error;

    if (optionsError) {
      console.error(
        "Academic options load error:",
        optionsError,
      );

      return NextResponse.json(
        { error: optionsError.message },
        { status: 400 },
      );
    }

    const registrations =
      studentResult.data.student_registrations ?? [];

    const currentRegistration = activeSession
      ? registrations.find(
          (registration) =>
            registration.session_id === activeSession.id,
        ) ?? null
      : null;

    return NextResponse.json({
      academic: {
        matric_no: studentResult.data.matric_no,
        program_id: studentResult.data.program_id,
        department_id: studentResult.data.department_id,
        admission_session_id:
          studentResult.data.admission_session_id,
        enrollment_date:
          studentResult.data.enrollment_date,
        sponsorship_type:
          studentResult.data.sponsorship_type,
        student_status: studentResult.data.status,

        level: currentRegistration?.level ?? null,
        registration_status:
          currentRegistration?.status ?? null,
        current_registration_id:
          currentRegistration?.id ?? null,
        current_session_id: activeSession?.id ?? null,
        current_session_name: activeSession?.name ?? null,
      },

      options: {
        programs:
          (programsResult.data ?? []) as AcademicOption[],

        departments:
          (departmentsResult.data ??
            []) as AcademicOption[],

        sessions:
          (sessionsResult.data ?? []) as AcademicOption[],
      },
    });
  } catch (error) {
    console.error(
      "Unexpected GET academic information error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load academic information.",
      },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------ */
/* PATCH ACADEMIC INFORMATION                       */
/* ------------------------------------------------ */

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id: studentId } = await context.params;

    if (!isUuid(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID." },
        { status: 400 },
      );
    }

    const authorization = await verifyAdministrator();

    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: AcademicUpdateBody;

    try {
      body =
        (await request.json()) as AcademicUpdateBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const activeSession = await getActiveSession();

    if (!activeSession) {
      return NextResponse.json(
        {
          error:
            "No active academic session is configured.",
        },
        { status: 409 },
      );
    }

    const { data: student, error: studentError } =
      await supabaseAdmin
        .from("students")
        .select("id")
        .eq("id", studentId)
        .is("archived_at", null)
        .maybeSingle();

    if (studentError) {
      return NextResponse.json(
        { error: studentError.message },
        { status: 400 },
      );
    }

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );
    }

    const studentUpdates: Record<
      string,
      string | null
    > = {};

    if (body.matric_no !== undefined) {
      studentUpdates.matric_no = parseRequiredText(
        body.matric_no,
        "Matric number",
        100,
      );
    }

    if (body.program_id !== undefined) {
      studentUpdates.program_id =
        parseNullableUuid(
          body.program_id,
          "Program",
        ) ?? null;
    }

    if (body.department_id !== undefined) {
      studentUpdates.department_id =
        parseNullableUuid(
          body.department_id,
          "Department",
        ) ?? null;
    }

    if (body.admission_session_id !== undefined) {
      studentUpdates.admission_session_id =
        parseNullableUuid(
          body.admission_session_id,
          "Admission session",
        ) ?? null;
    }

    if (body.enrollment_date !== undefined) {
      studentUpdates.enrollment_date =
        parseNullableDate(body.enrollment_date) ?? null;
    }

    if (body.sponsorship_type !== undefined) {
      studentUpdates.sponsorship_type =
        parseNullableText(
          body.sponsorship_type,
          100,
        ) ?? null;
    }

    if (body.student_status !== undefined) {
      const studentStatus = parseRequiredText(
        body.student_status,
        "Student status",
        30,
      );

      if (
        !ALLOWED_STUDENT_STATUSES.has(studentStatus)
      ) {
        return NextResponse.json(
          { error: "Invalid student status." },
          { status: 400 },
        );
      }

      studentUpdates.status = studentStatus;
    }

    if (Object.keys(studentUpdates).length > 0) {
      studentUpdates.updated_at =
        new Date().toISOString();

      const { error: updateStudentError } =
        await supabaseAdmin
          .from("students")
          .update(studentUpdates)
          .eq("id", studentId)
          .is("archived_at", null);

      if (updateStudentError) {
        console.error(
          "Academic student update error:",
          updateStudentError,
        );

        return NextResponse.json(
          { error: updateStudentError.message },
          { status: 400 },
        );
      }
    }

    const level =
      parseNullableText(body.level, 50) ?? null;

    const registrationStatus =
      parseNullableText(
        body.registration_status,
        50,
      ) ?? "registered";

    /*
     * Insert the active-session registration when it does not
     * exist, otherwise update the existing registration.
     */
    const {
      data: currentRegistration,
      error: registrationLookupError,
    } = await supabaseAdmin
      .from("student_registrations")
      .select("id")
      .eq("student_id", studentId)
      .eq("session_id", activeSession.id)
      .maybeSingle();

    if (registrationLookupError) {
      console.error(
        "Registration lookup error:",
        registrationLookupError,
      );

      return NextResponse.json(
        { error: registrationLookupError.message },
        { status: 400 },
      );
    }

    let registrationError: { message: string } | null =
      null;

    if (currentRegistration) {
      const result = await supabaseAdmin
        .from("student_registrations")
        .update({
          level,
          status: registrationStatus,
        })
        .eq("id", currentRegistration.id);

      registrationError = result.error;
    } else {
      const result = await supabaseAdmin
        .from("student_registrations")
        .insert({
          student_id: studentId,
          session_id: activeSession.id,
          level,
          status: registrationStatus,
        });

      registrationError = result.error;
    }

    if (registrationError) {
      console.error(
        "Registration update error:",
        registrationError,
      );

      return NextResponse.json(
        { error: registrationError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Academic information updated successfully.",
    });
  } catch (error) {
    console.error(
      "Unexpected PATCH academic information error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update academic information.",
      },
      { status: 500 },
    );
  }
}