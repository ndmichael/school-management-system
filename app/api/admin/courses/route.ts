import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAccess } from "@/lib/guards/requireAdminAccess";

type CourseRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number;
  department_id: string | null;
  level: string | null;
  created_at: string;
  updated_at: string;
};

type CreateCourseBody = {
  code?: unknown;
  title?: unknown;
  description?: unknown;
  credits?: unknown;
  department_id?: unknown;
  level?: unknown;
};

function normalizeRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function isPgUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (error as { code?: unknown }).code === "23505";
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const guard = await requireAdminAccess();

  if ("error" in guard) {
    return guard.error;
  }

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(`
      id,
      code,
      title,
      description,
      credits,
      department_id,
      level,
      created_at,
      updated_at
    `)
    .order("code", { ascending: true })
    .returns<CourseRow[]>();

  if (error) {
    console.error("GET /api/admin/courses failed:", error);

    return NextResponse.json(
      { error: "Failed to load courses." },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const guard = await requireAdminAccess();

  if ("error" in guard) {
    return guard.error;
  }

  let body: CreateCourseBody;

  try {
    body = (await req.json()) as CreateCourseBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const code = normalizeRequiredString(body.code);
  const title = normalizeRequiredString(body.title);
  const description = normalizeOptionalString(body.description);
  const departmentId = normalizeOptionalString(body.department_id);
  const level = normalizeOptionalString(body.level);

  const credits =
    typeof body.credits === "number"
      ? body.credits
      : typeof body.credits === "string" &&
          body.credits.trim() !== ""
        ? Number(body.credits)
        : Number.NaN;

  if (!code) {
    return NextResponse.json(
      { error: "Course code is required." },
      { status: 422 }
    );
  }

  if (!title) {
    return NextResponse.json(
      { error: "Course title is required." },
      { status: 422 }
    );
  }

  if (
    !Number.isInteger(credits) ||
    credits < 0 ||
    credits > 30
  ) {
    return NextResponse.json(
      {
        error:
          "Credits must be a whole number between 0 and 30.",
      },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("courses")
    .insert({
      code,
      title,
      description,
      credits,
      department_id: departmentId,
      level,
    })
    .select(`
      id,
      code,
      title,
      description,
      credits,
      department_id,
      level,
      created_at,
      updated_at
    `)
    .single<CourseRow>();

  if (error) {
    if (isPgUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A course with this code already exists." },
        { status: 409 }
      );
    }

    console.error("POST /api/admin/courses failed:", error);

    return NextResponse.json(
      { error: "Failed to create course." },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}