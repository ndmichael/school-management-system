import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Semester = "first" | "second";

type CreateOfferingBody = {
  course_id: string;
  session_id: string;
  semester: Semester;
  program_id: string | null;
  level: string | null;
};

type ErrorResponse = { error: string };
type SuccessResponse = { id: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isSemester(v: unknown): v is Semester {
  return v === "first" || v === "second";
}

function normalizeOptionalString(v: unknown): string | null {
  if (!isNonEmptyString(v)) return null;
  return v.trim();
}

function isPgUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const maybe = err as { code?: unknown };
  return maybe.code === "23505";
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
);

export async function POST(req: Request) {
  let raw: unknown;

  try {
    raw = (await req.json()) as unknown;
  } catch {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid body" },
      { status: 400 },
    );
  }

  const body = raw as Record<string, unknown>;

  const course_id = body.course_id;
  const session_id = body.session_id;
  const semester = body.semester;

  if (!isNonEmptyString(course_id) || !isNonEmptyString(session_id) || !isSemester(semester)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Missing/invalid required fields (course_id, session_id, semester)" },
      { status: 422 },
    );
  }

  const program_id = normalizeOptionalString(body.program_id);
  const level = normalizeOptionalString(body.level);

  // NOTE: your table defaults is_published=true, but your page sets false.
  // We keep your intent: create as unpublished.
  const payload: CreateOfferingBody = {
    course_id,
    session_id,
    semester,
    program_id,
    level,
  };

  const { data, error } = await supabaseAdmin
    .from("course_offerings")
    .insert({ ...payload, is_published: false })
    .select("id")
    .single();

  if (error) {
    if (isPgUniqueViolation(error)) {
      return NextResponse.json<ErrorResponse>(
        { error: "This course offering already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json<ErrorResponse>(
      { error: error.message || "Failed to create offering" },
      { status: 500 },
    );
  }

  return NextResponse.json<SuccessResponse>({ id: data.id }, { status: 201 });
}
