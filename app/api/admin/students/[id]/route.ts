import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface ArchiveRequestBody {
  reason?: unknown;
}

interface RegistrationRow {
  level: string | null;
  status: string | null;
  session_id: string;
  sessions:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
}

interface RawStudentDetail {
  id: string;
  matric_no: string;
  status: string | null;

  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_status: string | null;

  created_at: string;

  profiles:
    | {
        first_name: string;
        middle_name: string | null;
        last_name: string;
        email: string;
      }
    | {
        first_name: string;
        middle_name: string | null;
        last_name: string;
        email: string;
      }[]
    | null;

  programs:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;

  departments:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;

  student_registrations: RegistrationRow[] | null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseArchiveReason(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const reason = value.trim();

  return reason ? reason.slice(0, 500) : null;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

/* ------------------------------------------------ */
/* GET STUDENT DETAILS                              */
/* ------------------------------------------------ */

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id: studentId } = await context.params;

    if (!isUuid(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 },
      );
    }

    const { data: activeSession, error: activeSessionError } =
      await supabaseAdmin
        .from("sessions")
        .select("id, name")
        .eq("is_active", true)
        .maybeSingle();

    if (activeSessionError) {
      console.error(
        "GET student active session error:",
        activeSessionError,
      );

      return NextResponse.json(
        { error: activeSessionError.message },
        { status: 400 },
      );
    }

    let query = supabaseAdmin
      .from("students")
      .select(`
        id,
        matric_no,
        status,
        guardian_first_name,
        guardian_last_name,
        guardian_phone,
        guardian_status,
        created_at,

        profiles:profiles!students_profile_id_fkey (
          first_name,
          middle_name,
          last_name,
          email
        ),

        programs:program_id (
          name
        ),

        departments:department_id (
          name
        ),

        student_registrations (
          level,
          status,
          session_id,

          sessions:session_id (
            id,
            name
          )
        )
      `)
      .eq("id", studentId)
      .is("archived_at", null);

    if (activeSession) {
      query = query.eq(
        "student_registrations.session_id",
        activeSession.id,
      );
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("GET student details error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 },
      );
    }

    const rawStudent =
      data as unknown as RawStudentDetail;

    const profile = firstRelation(rawStudent.profiles);
    const program = firstRelation(rawStudent.programs);
    const department = firstRelation(
      rawStudent.departments,
    );

    const registration =
      rawStudent.student_registrations?.find(
        (item) =>
          !activeSession ||
          item.session_id === activeSession.id,
      ) ?? null;

    const session = registration
      ? firstRelation(registration.sessions)
      : null;

    return NextResponse.json({
      student: {
        id: rawStudent.id,
        matric_no: rawStudent.matric_no,
        level: registration?.level ?? null,
        status: rawStudent.status,

        profiles: profile
          ? {
              first_name: profile.first_name,
              middle_name: profile.middle_name,
              last_name: profile.last_name,
              email: profile.email,
            }
          : null,

        programs: program
          ? {
              name: program.name,
            }
          : null,

        departments: department
          ? {
              name: department.name,
            }
          : null,

        sessions: session
          ? {
              name: session.name,
            }
          : activeSession
            ? {
                name: activeSession.name,
              }
            : null,

        guardian_first_name:
          rawStudent.guardian_first_name,

        guardian_last_name:
          rawStudent.guardian_last_name,

        guardian_phone:
          rawStudent.guardian_phone,

        guardian_status:
          rawStudent.guardian_status,

        created_at: rawStudent.created_at,
      },
    });
  } catch (error) {
    console.error(
      "Unexpected GET /api/admin/students/[id] error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load student details",
      },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------ */
/* ARCHIVE STUDENT                                  */
/* ------------------------------------------------ */

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id: studentId } = await context.params;

    if (!isUuid(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: adminProfile, error: adminProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, main_role")
        .eq("id", user.id)
        .maybeSingle();

    if (adminProfileError) {
      console.error(
        "Archive student profile lookup error:",
        adminProfileError,
      );

      return NextResponse.json(
        { error: "Failed to verify administrator" },
        { status: 500 },
      );
    }

    const allowedAdminRoles = new Set([
      "admin",
      "administrator",
      "super_admin",
    ]);

    if (
      !adminProfile ||
      !allowedAdminRoles.has(
        String(adminProfile.main_role),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not allowed to archive students",
        },
        { status: 403 },
      );
    }

    let body: ArchiveRequestBody = {};

    try {
      body =
        (await request.json()) as ArchiveRequestBody;
    } catch {
      // Archive reason is optional.
    }

    const archiveReason = parseArchiveReason(
      body.reason,
    );

    const {
      data: existingStudent,
      error: existingStudentError,
    } = await supabaseAdmin
      .from("students")
      .select("id, archived_at")
      .eq("id", studentId)
      .maybeSingle();

    if (existingStudentError) {
      console.error(
        "Archive student lookup error:",
        existingStudentError,
      );

      return NextResponse.json(
        { error: existingStudentError.message },
        { status: 400 },
      );
    }

    if (!existingStudent) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 },
      );
    }

    if (existingStudent.archived_at) {
      return NextResponse.json(
        {
          error:
            "Student has already been archived",
        },
        { status: 409 },
      );
    }

    const archivedAt = new Date().toISOString();

    const {
      data: archivedStudent,
      error: archiveError,
    } = await supabaseAdmin
      .from("students")
      .update({
        archived_at: archivedAt,
        archived_by: adminProfile.id,
        archive_reason: archiveReason,
        updated_at: archivedAt,
      })
      .eq("id", studentId)
      .is("archived_at", null)
      .select("id, archived_at")
      .maybeSingle();

    if (archiveError) {
      console.error(
        "Archive student error:",
        archiveError,
      );

      return NextResponse.json(
        { error: archiveError.message },
        { status: 400 },
      );
    }

    if (!archivedStudent) {
      return NextResponse.json(
        {
          error:
            "Student could not be archived or was already archived",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      message: "Student archived successfully",
      student: archivedStudent,
    });
  } catch (error) {
    console.error(
      "Unexpected DELETE /api/admin/students/[id] error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to archive student",
      },
      { status: 500 },
    );
  }
}