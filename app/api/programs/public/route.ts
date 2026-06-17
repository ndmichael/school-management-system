import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProgramRow = {
  id: string;
  name: string;
  description: string | null;
  features: string[] | null;
  image_url: string | null;
  type: string;
  level: string;
  duration: number | null;
  is_active: boolean;
};

type StudentProgramRow = {
  program_id: string | null;
};

type ProgramDTO = {
  id: string;
  title: string;
  description: string;
  duration: string;
  students: number;
  level: string;
  type: string;
  featured: boolean;
  features: string[];
  image: string;
};

type ErrorResponse = {
  error: string;
};

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function parseLimit(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get("limit");

  if (!raw) return null;

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) return null;

  const limit = Math.floor(parsed);

  if (limit <= 0) return null;

  return Math.min(limit, 50);
}

function placeholderImage(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!baseUrl) return "";

  return `${baseUrl}/storage/v1/object/public/programs/placeholder.jpg`;
}

function formatDuration(
  duration: number | null,
): string {
  if (
    duration === null ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return "—";
  }

  return `${duration} ${
    duration === 1 ? "Year" : "Years"
  }`;
}

function normalizeProgram(
  row: ProgramRow,
  studentCount: number,
): ProgramDTO {
  const image = row.image_url?.trim()
    ? row.image_url
    : placeholderImage();

  return {
    id: row.id,
    title: row.name,
    description: row.description ?? "",
    duration: formatDuration(row.duration),
    students: studentCount,
    level: row.level,
    type: toTitleCase(row.type),
    featured: false,
    features: Array.isArray(row.features)
      ? row.features
      : [],
    image:
      image ||
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&q=80",
  };
}

export async function GET(request: NextRequest) {
  try {
    const limit = parseLimit(request);

    let programsQuery = supabaseAdmin
      .from("programs")
      .select(
        `
          id,
          name,
          description,
          features,
          image_url,
          type,
          level,
          duration,
          is_active
        `,
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (limit) {
      programsQuery = programsQuery.limit(limit);
    }

    const [programsResult, studentsResult] =
      await Promise.all([
        programsQuery,

        supabaseAdmin
          .from("students")
          .select("program_id")
          .is("archived_at", null)
          .not("program_id", "is", null),
      ]);

    if (programsResult.error) {
      return NextResponse.json<ErrorResponse>(
        { error: programsResult.error.message },
        { status: 400 },
      );
    }

    if (studentsResult.error) {
      return NextResponse.json<ErrorResponse>(
        { error: studentsResult.error.message },
        { status: 400 },
      );
    }

    const studentCounts = new Map<string, number>();

    for (const student of (studentsResult.data ??
      []) as StudentProgramRow[]) {
      if (!student.program_id) continue;

      studentCounts.set(
        student.program_id,
        (studentCounts.get(student.program_id) ?? 0) +
          1,
      );
    }

    const programs = (programsResult.data ??
      []) as ProgramRow[];

    const response = programs.map((program) =>
      normalizeProgram(
        program,
        studentCounts.get(program.id) ?? 0,
      ),
    );

    return NextResponse.json<ProgramDTO[]>(response, {
      status: 200,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error";

    return NextResponse.json<ErrorResponse>(
      { error: message },
      { status: 500 },
    );
  }
}