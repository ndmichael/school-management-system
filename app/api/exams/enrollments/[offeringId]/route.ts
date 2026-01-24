import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireExamsAccess } from "@/lib/guards/requireExamsAccess";

type Params = { offeringId: string };

type StudentProfile = { first_name: string; last_name: string };
type StudentProgram = { name: string } | null;

type RosterRow = {
  id: string; // enrollment id
  students: {
    id: string; // students.id
    matric_no: string;
    level: string | null;              // ✅ add
    program: StudentProgram;           // ✅ add (programs.name)
    profiles: StudentProfile[] | null;
  } | null;
};

type EnrollBody = { studentIds: string[] };
type DeleteBody = { studentIds: string[] };

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizeUuidList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => isUuid(x));
}

// POST /api/exams/enrollments/:offeringId  (bulk add)
export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { offeringId } = await ctx.params;

  if (!isUuid(offeringId)) {
    return NextResponse.json({ error: "Invalid offeringId" }, { status: 400 });
  }

  let body: EnrollBody;
  try {
    body = (await req.json()) as EnrollBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const studentIds = normalizeUuidList(body.studentIds);

  if (studentIds.length === 0) {
    return NextResponse.json({ error: "studentIds must be valid UUIDs" }, { status: 400 });
  }

  const rows = studentIds.map((student_id) => ({
    student_id,
    course_offering_id: offeringId,
  }));

  const { error } = await supabaseAdmin
    .from("enrollments")
    .upsert(rows, { onConflict: "student_id,course_offering_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

// GET /api/exams/enrollments/:offeringId  (roster)
export async function GET(_req: NextRequest, ctx: { params: Promise<Params> }) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { offeringId } = await ctx.params;

  if (!isUuid(offeringId)) {
    return NextResponse.json({ error: "Invalid offeringId" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select(
      `
      id,
      students (
        id,
        matric_no,
        level,
        program:programs ( name ),
        profiles!students_profile_id_fkey (
          first_name,
          last_name
        )
      )
    `
    )
    .eq("course_offering_id", offeringId)
    .returns<RosterRow[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ roster: data ?? [] });
}

// DELETE /api/exams/enrollments/:offeringId  (bulk remove)
export async function DELETE(req: NextRequest, ctx: { params: Promise<Params> }) {
  const guard = await requireExamsAccess();
  if ("error" in guard) return guard.error;

  const { offeringId } = await ctx.params;

  if (!isUuid(offeringId)) {
    return NextResponse.json({ error: "Invalid offeringId" }, { status: 400 });
  }

  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const studentIds = normalizeUuidList(body.studentIds);

  if (studentIds.length === 0) {
    return NextResponse.json({ error: "studentIds must be valid UUIDs" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("enrollments")
    .delete()
    .eq("course_offering_id", offeringId)
    .in("student_id", studentIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
