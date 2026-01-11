import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type Semester = "first" | "second";

type GetResponse = {
  id: string;
  course_id: string;
  session_id: string;
  semester: Semester;
  level: string | null;
  is_published: boolean;
  program_ids: string[];
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { data: offering, error: offeringErr } = await supabase
    .from("course_offerings")
    .select("id, course_id, session_id, semester, level, is_published")
    .eq("id", id)
    .single();

  if (offeringErr || !offering) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: mappings, error: mapErr } = await supabase
    .from("course_offering_programs")
    .select("program_id")
    .eq("course_offering_id", id);

  if (mapErr) {
    return NextResponse.json({ error: mapErr.message }, { status: 500 });
  }

  const program_ids = (mappings ?? [])
    .map((m) => m.program_id)
    .filter((x): x is string => typeof x === "string" && x.length > 0);

  const res: GetResponse = {
    id: offering.id,
    course_id: offering.course_id,
    session_id: offering.session_id,
    semester: offering.semester,
    level: offering.level ?? null,
    is_published: offering.is_published,
    program_ids,
  };

  return NextResponse.json(res);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as unknown;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  }

  const b = body as Partial<{
    course_id: string;
    session_id: string;
    semester: Semester;
    level: string | null;
    program_ids: string[];
  }>;

  // Offering updates
  const update: Record<string, string | null> = {};
  if (typeof b.course_id === "string") update.course_id = b.course_id;
  if (typeof b.session_id === "string") update.session_id = b.session_id;
  if (b.semester === "first" || b.semester === "second") update.semester = b.semester;
  if (b.level === null || typeof b.level === "string") update.level = b.level ?? null;

  // Programs (required by your rule B)
  const program_ids = readStringArray(b.program_ids);
  if (b.program_ids !== undefined && program_ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one program for this offering." },
      { status: 422 }
    );
  }

  // 1) Update offering fields if any
  if (Object.keys(update).length > 0) {
    const { error: upErr } = await supabase.from("course_offerings").update(update).eq("id", id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // 2) Replace program mappings if provided
  if (b.program_ids !== undefined) {
    const { error: delErr } = await supabase
      .from("course_offering_programs")
      .delete()
      .eq("course_offering_id", id);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const rows = program_ids.map((program_id) => ({
      course_offering_id: id,
      program_id,
    }));

    const { error: insErr } = await supabase.from("course_offering_programs").insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
