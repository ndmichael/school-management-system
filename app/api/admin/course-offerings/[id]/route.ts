import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { data, error } = await supabase
    .from("course_offerings")
    .select("id, course_id, session_id, semester, program_id, level, is_published")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as unknown;
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  }

  const b = body as Partial<{
    course_id: string;
    session_id: string;
    semester: "first" | "second";
    program_id: string | null;
    level: string | null;
  }>;

  const update: Record<string, string | null> = {};
  if (typeof b.course_id === "string") update.course_id = b.course_id;
  if (typeof b.session_id === "string") update.session_id = b.session_id;
  if (b.semester === "first" || b.semester === "second") update.semester = b.semester;
  if (b.program_id === null || typeof b.program_id === "string") update.program_id = b.program_id ?? null;
  if (b.level === null || typeof b.level === "string") update.level = b.level ?? null;

  const { error } = await supabase.from("course_offerings").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
