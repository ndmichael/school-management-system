import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Semester = "first" | "second";

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

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isPgUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const maybe = err as { code?: unknown };
  return maybe.code === "23505";
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  let raw: unknown;

  try {
    raw = (await req.json()) as unknown;
  } catch {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json<ErrorResponse>({ error: "Invalid body" }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;

  const course_id = body.course_id;
  const session_id = body.session_id;
  const semester = body.semester;

  if (!isNonEmptyString(course_id) || !isNonEmptyString(session_id) || !isSemester(semester)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Missing/invalid required fields (course_id, session_id, semester)" },
      { status: 422 }
    );
  }

  // ✅ programs are required (rule B)
  const program_ids = readStringArray(body.program_ids);
  if (program_ids.length === 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "Select at least one program for this offering." },
      { status: 422 }
    );
  }

  const level = normalizeOptionalString(body.level);

  // 1) create offering (always unpublished here)
  const { data, error } = await supabaseAdmin
    .from("course_offerings")
    .insert({
      course_id: course_id.trim(),
      session_id: session_id.trim(),
      semester,
      level,
      is_published: false,
    })
    .select("id")
    .single();

  if (error) {
    if (isPgUniqueViolation(error)) {
      return NextResponse.json<ErrorResponse>(
        { error: "This course offering already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json<ErrorResponse>(
      { error: error.message || "Failed to create offering" },
      { status: 500 }
    );
  }

  const offeringId = data.id as string;

  // 2) insert program mappings
  const rows = program_ids.map((program_id) => ({
    course_offering_id: offeringId,
    program_id,
  }));

  const { error: mapErr } = await supabaseAdmin
    .from("course_offering_programs")
    .insert(rows);

  if (mapErr) {
    // rollback the offering so you don’t create “dangling” unpublished offerings
    await supabaseAdmin.from("course_offerings").delete().eq("id", offeringId);
    return NextResponse.json<ErrorResponse>(
      { error: mapErr.message || "Failed to assign programs" },
      { status: 500 }
    );
  }

  return NextResponse.json<SuccessResponse>({ id: offeringId }, { status: 201 });
}
