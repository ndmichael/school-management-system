import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/guards/requireAdminAccess";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ValidatedStudentInput = {
  student_id: string;
  level: string | null;
  update_student_level: boolean;
};

type StudentValidationResult =
  | {
      success: true;
      student: ValidatedStudentInput;
    }
  | {
      success: false;
      error: string;
    };

type SkippedStudent = {
  student_id: string;
  reason: string;
};

type BulkRegistrationResult = {
  submitted_count: number;
  inserted_count: number;
  updated_level_count: number;
  skipped_count: number;
  skipped: SkippedStudent[];
};

const MAX_STUDENTS_PER_REQUEST = 1000;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Validates and normalises one selected student.
 *
 * Empty levels become null. The update flag defaults to false.
 */
function validateStudentInput(
  value: unknown,
  index: number,
): StudentValidationResult {
  if (!isRecord(value)) {
    return {
        success: false,
      error: `Student at position ${index + 1} must be an object.`,
    };
  }

  const studentId = value.student_id;

  if (
    typeof studentId !== "string" ||
    !isUuid(studentId)
  ) {
    return {
      success: false,
      error: `Student at position ${index + 1} requires a valid student_id.`,
    };
  }

  let level: string | null = null;

  if (
    value.level !== undefined &&
    value.level !== null
  ) {
    if (typeof value.level !== "string") {
      return {
        success: false,
        error: `Level for student ${studentId} must be a string or null.`,
      };
    }

    level = value.level.trim() || null;
  }

  let updateStudentLevel = false;

  if (value.update_student_level !== undefined) {
    if (
      typeof value.update_student_level !== "boolean"
    ) {
      return {
        success: false,
        error: `update_student_level for student ${studentId} must be a boolean.`,
      };
    }

    updateStudentLevel =
      value.update_student_level;
  }

  return {
    success: true,
    student: {
      student_id: studentId,
      level,
      update_student_level:
        updateStudentLevel,
    },
  };
}

/**
 * POST /api/admin/student-registrations/bulk
 *
 * Executes the selected bulk registrations through one
 * transactional PostgreSQL RPC.
 */
export async function POST(request: Request) {
  const guard = await requireAdminAccess();

  if ("error" in guard) {
    return guard.error;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Request body must be an object." },
      { status: 400 },
    );
  }

  const sourceSessionId =
    body.source_session_id;

  const targetSessionId =
    body.target_session_id;

  if (
    typeof sourceSessionId !== "string" ||
    !isUuid(sourceSessionId)
  ) {
    return NextResponse.json(
      {
        error:
          "A valid source_session_id is required.",
      },
      { status: 422 },
    );
  }

  if (
    typeof targetSessionId !== "string" ||
    !isUuid(targetSessionId)
  ) {
    return NextResponse.json(
      {
        error:
          "A valid target_session_id is required.",
      },
      { status: 422 },
    );
  }

  if (sourceSessionId === targetSessionId) {
    return NextResponse.json(
      {
        error:
          "Source and target sessions must be different.",
      },
      { status: 422 },
    );
  }

  if (
    !Array.isArray(body.students) ||
    body.students.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "At least one student must be selected.",
      },
      { status: 422 },
    );
  }

  if (
    body.students.length >
    MAX_STUDENTS_PER_REQUEST
  ) {
    return NextResponse.json(
      {
        error: `A maximum of ${MAX_STUDENTS_PER_REQUEST} students can be submitted at once.`,
      },
      { status: 422 },
    );
  }

  const students: ValidatedStudentInput[] = [];

  /*
   * Validate every submitted student before calling the RPC.
   * One malformed item rejects the request before any write begins.
   */
  for (
    let index = 0;
    index < body.students.length;
    index += 1
  ) {
    const result = validateStudentInput(
      body.students[index],
      index,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 422 },
      );
    }

    students.push(result.student);
  }

  /*
   * The UI classifications are not trusted here.
   *
   * The RPC independently checks source membership, student
   * status, programme, duplicates and target-session validity.
   */
  const { data, error } =
    await supabaseAdmin.rpc(
      "register_students_for_session",
      {
        p_source_session_id:
          sourceSessionId,
        p_target_session_id:
          targetSessionId,
        p_students: students,
      },
    );

  if (error) {
    console.error(
      "Bulk student registration RPC failed:",
      error,
    );

    if (error.code === "P0002") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (
      error.code === "22023" ||
      error.code === "22P02"
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to complete bulk registration.",
      },
      { status: 500 },
    );
  }

  const result =
    data as BulkRegistrationResult | null;

  if (!result) {
    return NextResponse.json(
      {
        error:
          "The registration operation returned no result.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `${result.inserted_count} student(s) registered successfully.`,
    result,
  });
}