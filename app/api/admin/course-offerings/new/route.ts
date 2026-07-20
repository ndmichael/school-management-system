import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAccess } from "@/lib/guards/requireAdminAccess";

type Semester = "first" | "second";

type ErrorResponse = {
  error: string;
};

type SuccessResponse = {
  id: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSemester(value: unknown): value is Semester {
  return value === "first" || value === "second";
}

function normalizeOptionalString(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function readUniqueStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

function getPostgresErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : null;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const guard = await requireAdminAccess();

  if ("error" in guard) {
    return guard.error;
  }

  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const body = raw as Record<string, unknown>;

  const courseId = body.course_id;
  const sessionId = body.session_id;
  const semester = body.semester;

  if (!isNonEmptyString(courseId)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Course is required." },
      { status: 422 }
    );
  }

  if (!isNonEmptyString(sessionId)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Academic session is required." },
      { status: 422 }
    );
  }

  if (!isSemester(semester)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Semester must be first or second." },
      { status: 422 }
    );
  }

  const programIds = readUniqueStringArray(body.program_ids);

  if (programIds.length === 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "Select at least one programme." },
      { status: 422 }
    );
  }

  const level = normalizeOptionalString(body.level);

  const { data, error } = await supabaseAdmin.rpc(
    "create_course_offering_with_programs",
    {
      p_course_id: courseId.trim(),
      p_session_id: sessionId.trim(),
      p_semester: semester,
      p_level: level,
      p_program_ids: programIds,
    }
  );

  if (error) {
    const errorCode = getPostgresErrorCode(error);

    if (errorCode === "23505") {
      return NextResponse.json<ErrorResponse>(
        {
          error:
            "This course offering already exists for the selected session, semester and level.",
        },
        { status: 409 }
      );
    }

    if (errorCode === "23503") {
      return NextResponse.json<ErrorResponse>(
        {
          error:
            "The selected course, session or programme does not exist.",
        },
        { status: 422 }
      );
    }

    if (errorCode === "22023") {
      return NextResponse.json<ErrorResponse>(
        { error: error.message },
        { status: 422 }
      );
    }

    console.error(
      "POST /api/admin/course-offerings/new failed:",
      error
    );

    return NextResponse.json<ErrorResponse>(
      { error: "Failed to create course offering." },
      { status: 500 }
    );
  }

  return NextResponse.json<SuccessResponse>(
    { id: data as string },
    { status: 201 }
  );
}