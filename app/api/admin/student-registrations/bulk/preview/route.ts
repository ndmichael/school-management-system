import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/guards/requireAdminAccess";
import { getSessionStatus } from "@/lib/sessions/session-status";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RegistrationStatus =
  | "registered"
  | "deferred"
  | "withdrawn";

type StudentStatus =
  | "active"
  | "suspended"
  | "dismissed"
  | "withdrawn"
  | "graduated"
  | null;

type PreviewClassification =
  | "eligible"
  | "needs_review"
  | "excluded"
  | "already_registered";

type PreviewRequestBody = {
  source_session_id?: unknown;
  target_session_id?: unknown;
};

type SessionRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean | null;
};

type ProfileRelation = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
};

type ProgramRelation = {
  id: string;
  name: string | null;
};

type StudentRelation = {
  id: string;
  matric_no: string;
  program_id: string | null;
  level: string | null;
  status: StudentStatus;
  archived_at: string | null;

  profiles:
    | ProfileRelation
    | ProfileRelation[]
    | null;

  programs:
    | ProgramRelation
    | ProgramRelation[]
    | null;
};

type SourceRegistrationRow = {
  student_id: string;
  level: string | null;
  status: RegistrationStatus;

  students:
    | StudentRelation
    | StudentRelation[]
    | null;
};

type TargetRegistrationRow = {
  student_id: string;
};

type PreviewStudent = {
  student_id: string;
  matric_no: string;
  name: string;
  programme: {
    id: string;
    name: string | null;
  } | null;

  student_status: StudentStatus;
  source_registration_status: RegistrationStatus;

  /*
   * Level is optional in your system.
   *
   * approved_level is only a suggested value for the UI.
   * It may remain null during bulk execution.
   */
  current_level: string | null;
  source_level: string | null;
  approved_level: string | null;

  classification: PreviewClassification;
  reasons: string[];
};

const PAGE_SIZE = 500;

/**
 * Confirms that a string is formatted like a UUID.
 *
 * The database would also reject an invalid UUID, but validating
 * here gives the caller a controlled 422 response instead of a
 * less helpful database error.
 */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Supabase relationships may be returned as either one object
 * or an array depending on the generated relationship typing.
 *
 * This helper gives the rest of the route one predictable object.
 */
function firstRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

/**
 * Builds the student's readable full name.
 */
function getStudentName(
  profile: ProfileRelation | null,
  matricNumber: string,
): string {
  if (!profile) {
    return matricNumber;
  }

  const fullName = [
    profile.first_name,
    profile.middle_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || matricNumber;
}

/**
 * Loads every registration in the source session.
 *
 * We fetch in batches because Supabase/PostgREST projects often
 * have a maximum row response limit. Without pagination, a future
 * source session containing more than 1,000 students could be
 * silently truncated.
 */
async function loadSourceRegistrations(
  sourceSessionId: string,
): Promise<SourceRegistrationRow[]> {
  const registrations: SourceRegistrationRow[] = [];

  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("student_registrations")
      .select(`
        student_id,
        level,
        status,

        students!student_registrations_student_id_fkey (
          id,
          matric_no,
          program_id,
          level,
          status,
          archived_at,

          profiles!students_profile_id_fkey (
            first_name,
            middle_name,
            last_name
          ),

          programs:program_id (
            id,
            name
          )
        )
      `)
      .eq("session_id", sourceSessionId)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `Failed to load source registrations: ${error.message}`,
      );
    }

    const batch =
      (data ?? []) as unknown as SourceRegistrationRow[];

    registrations.push(...batch);

    /*
     * A partial page means there are no additional rows.
     */
    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return registrations;
}

/**
 * Loads student IDs already registered in the target session.
 *
 * These IDs are converted into a Set so duplicate checks are fast:
 * Set.has() is preferable to repeatedly scanning an array.
 */
async function loadTargetStudentIds(
  targetSessionId: string,
): Promise<Set<string>> {
  const studentIds = new Set<string>();

  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("student_registrations")
      .select("student_id")
      .eq("session_id", targetSessionId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `Failed to load target registrations: ${error.message}`,
      );
    }

    const batch =
      (data ?? []) as TargetRegistrationRow[];

    for (const registration of batch) {
      studentIds.add(registration.student_id);
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return studentIds;
}

/**
 * Classifies one source registration.
 *
 * Priority:
 * 1. Already registered in target
 * 2. Hard exclusions
 * 3. Cases requiring admin review
 * 4. Eligible
 */
function classifyRegistration(
  registration: SourceRegistrationRow,
  targetStudentIds: Set<string>,
): PreviewStudent {
  const student = firstRelation(registration.students);

  /*
   * This should be rare because the foreign key uses ON DELETE
   * CASCADE, but the preview remains defensive.
   */
  if (!student) {
    return {
      student_id: registration.student_id,
      matric_no: "Unknown",
      name: "Missing student record",
      programme: null,
      student_status: null,
      source_registration_status:
        registration.status,
      current_level: null,
      source_level: registration.level,
      approved_level: registration.level,
      classification: "excluded",
      reasons: ["Student record could not be loaded."],
    };
  }

  const profile = firstRelation(student.profiles);
  const programme = firstRelation(student.programs);

  const previewStudent: Omit<
    PreviewStudent,
    "classification" | "reasons"
  > = {
    student_id: student.id,
    matric_no: student.matric_no,
    name: getStudentName(
      profile,
      student.matric_no,
    ),
    programme: programme
      ? {
          id: programme.id,
          name: programme.name,
        }
      : null,
    student_status: student.status,
    source_registration_status:
      registration.status,
    current_level: student.level,
    source_level: registration.level,

    /*
     * Prefer the level recorded for the source session.
     * Fall back to the student's current level.
     * Both values may legally be null.
     */
    approved_level:
      registration.level ??
      student.level ??
      null,
  };

  if (targetStudentIds.has(student.id)) {
    return {
      ...previewStudent,
      classification: "already_registered",
      reasons: [
        "Student is already registered for the target session.",
      ],
    };
  }

  const exclusionReasons: string[] = [];

  if (student.archived_at !== null) {
    exclusionReasons.push("Student is archived.");
  }

  if (registration.status === "withdrawn") {
    exclusionReasons.push(
      "Source-session registration is withdrawn.",
    );
  }

  if (
    student.status !== null &&
    student.status !== "active"
  ) {
    exclusionReasons.push(
      `Student status is ${student.status}.`,
    );
  }

  if (exclusionReasons.length > 0) {
    return {
      ...previewStudent,
      classification: "excluded",
      reasons: exclusionReasons,
    };
  }

  const reviewReasons: string[] = [];

  /*
   * A missing status should not be treated as active automatically.
   * The admin should review the student record first.
   */
  if (student.status === null) {
    reviewReasons.push(
      "Student status has not been set.",
    );
  }

  if (registration.status === "deferred") {
    reviewReasons.push(
      "Source-session registration is deferred.",
    );
  }

  /*
   * Programme changes are handled before bulk registration.
   * A missing programme therefore requires review, but level does not.
   */
  if (student.program_id === null) {
    reviewReasons.push(
      "Student has no programme assigned.",
    );
  }

  if (reviewReasons.length > 0) {
    return {
      ...previewStudent,
      classification: "needs_review",
      reasons: reviewReasons,
    };
  }

  return {
    ...previewStudent,
    classification: "eligible",
    reasons: [],
  };
}

/**
 * POST /api/admin/student-registrations/bulk/preview
 *
 * This endpoint is read-only. It performs no inserts or updates.
 */
export async function POST(request: Request) {
  const guard = await requireAdminAccess();

  if ("error" in guard) {
    return guard.error;
  }

  let body: PreviewRequestBody;

  try {
    body =
      (await request.json()) as PreviewRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (
    typeof body.source_session_id !== "string" ||
    !isUuid(body.source_session_id)
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
    typeof body.target_session_id !== "string" ||
    !isUuid(body.target_session_id)
  ) {
    return NextResponse.json(
      {
        error:
          "A valid target_session_id is required.",
      },
      { status: 422 },
    );
  }

  const sourceSessionId =
    body.source_session_id;

  const targetSessionId =
    body.target_session_id;

  /*
   * The browser will also prevent this selection, but the backend
   * remains authoritative because clients can be modified or bypassed.
   */
  if (sourceSessionId === targetSessionId) {
    return NextResponse.json(
      {
        error:
          "Source and target sessions must be different.",
      },
      { status: 422 },
    );
  }

  try {
    /*
     * Fetch both sessions in one query.
     */
    const {
      data: sessionData,
      error: sessionError,
    } = await supabaseAdmin
      .from("sessions")
      .select(
        "id,name,start_date,end_date,is_active",
      )
      .in("id", [
        sourceSessionId,
        targetSessionId,
      ]);

    if (sessionError) {
      throw new Error(
        `Failed to load sessions: ${sessionError.message}`,
      );
    }

    const sessions =
      (sessionData ?? []) as SessionRow[];

    const sourceSession = sessions.find(
      (session) =>
        session.id === sourceSessionId,
    );

    const targetSession = sessions.find(
      (session) =>
        session.id === targetSessionId,
    );

    if (!sourceSession) {
      return NextResponse.json(
        { error: "Source session not found." },
        { status: 404 },
      );
    }

    if (!targetSession) {
      return NextResponse.json(
        { error: "Target session not found." },
        { status: 404 },
      );
    }

    const targetStatus = getSessionStatus(
      targetSession.is_active,
      targetSession.end_date,
    );

    /*
     * Completed sessions are historical records and cannot
     * receive new bulk registrations.
     */
    if (targetStatus === "completed") {
      return NextResponse.json(
        {
          error:
            "A completed session cannot be used as the target.",
        },
        { status: 422 },
      );
    }

    /*
     * After session validation, source and target data can be
     * loaded concurrently because the queries are independent.
     */
    const [
      sourceRegistrations,
      targetStudentIds,
    ] = await Promise.all([
      loadSourceRegistrations(sourceSessionId),
      loadTargetStudentIds(targetSessionId),
    ]);

    if (sourceRegistrations.length === 0) {
      return NextResponse.json(
        {
          error:
            "The source session has no student registration records.",
        },
        { status: 422 },
      );
    }

    const students = sourceRegistrations.map(
      (registration) =>
        classifyRegistration(
          registration,
          targetStudentIds,
        ),
    );

    const summary = students.reduce(
      (result, student) => {
        result.total += 1;
        result[student.classification] += 1;

        return result;
      },
      {
        total: 0,
        eligible: 0,
        needs_review: 0,
        excluded: 0,
        already_registered: 0,
      },
    );

    return NextResponse.json({
      source_session: {
        ...sourceSession,
        status: getSessionStatus(
          sourceSession.is_active,
          sourceSession.end_date,
        ),
      },
      target_session: {
        ...targetSession,
        status: targetStatus,
      },
      summary,
      students,
    });
  } catch (error) {
    console.error(
      "POST bulk registration preview failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate bulk-registration preview.",
      },
      { status: 500 },
    );
  }
}