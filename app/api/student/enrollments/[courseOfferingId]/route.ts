// app/api/student/enrollments/[courseOfferingId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudentAccess } from "@/lib/guards/requireStudentAccess";

type RouteParams = { courseOfferingId: string };

type OfferingRow = {
  id: string;
  session_id: string;
  program_id: string | null;
  is_published: boolean;
};

type RegistrationRow = {
  id: string;
  student_id: string;
  session_id: string;
  status: string;
};

type ProgramLinkRow = { course_offering_id: string; program_id: string };

async function readParams(
  ctx: { params: Promise<RouteParams> | RouteParams }
): Promise<RouteParams> {
  return ctx.params instanceof Promise ? await ctx.params : ctx.params;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<RouteParams> | RouteParams }
): Promise<NextResponse> {
  const guard = await requireStudentAccess();
  if ("error" in guard) return guard.error;

  const supabase = await createClient();
  const { user } = guard;

  const params = await readParams(ctx);
  const courseOfferingId = params.courseOfferingId?.trim() ?? "";

  if (!courseOfferingId) {
    return NextResponse.json({ error: "Missing courseOfferingId" }, { status: 400 });
  }

  if (!user.program_id) {
    return NextResponse.json({ error: "Student is missing program_id" }, { status: 400 });
  }

  // 1) offering must exist + published
  const { data: offering, error: offErr } = await supabase
    .from("course_offerings")
    .select("id, session_id, program_id, is_published")
    .eq("id", courseOfferingId)
    .single<OfferingRow>();

  if (offErr || !offering) {
    return NextResponse.json({ error: "Course offering not found" }, { status: 404 });
  }

  if (!offering.is_published) {
    return NextResponse.json({ error: "Course offering is not published" }, { status: 403 });
  }

  // 2) gate: must be registered for that session
  const { data: reg, error: regErr } = await supabase
    .from("student_registrations")
    .select("id, student_id, session_id, status")
    .eq("student_id", user.student_id)
    .eq("session_id", offering.session_id)
    .maybeSingle<RegistrationRow>();

  if (regErr) {
    return NextResponse.json({ error: regErr.message }, { status: 400 });
  }

  if (!reg || reg.status !== "registered") {
    return NextResponse.json({ error: "You are not registered for this session." }, { status: 403 });
  }

  // 3) program eligibility: direct match OR M2M link
  let eligible = offering.program_id === user.program_id;

  if (!eligible) {
    const { data: link, error: linkErr } = await supabase
      .from("course_offering_programs")
      .select("course_offering_id, program_id")
      .eq("course_offering_id", courseOfferingId)
      .eq("program_id", user.program_id)
      .maybeSingle<ProgramLinkRow>();

    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 400 });
    }

    eligible = !!link;
  }

  if (!eligible) {
    return NextResponse.json({ error: "You are not eligible for this course offering." }, { status: 403 });
  }

  // 4) insert enrollment (unique(student_id, course_offering_id) already protects duplicates)
  const { error: insErr } = await supabase.from("enrollments").insert({
    student_id: user.student_id,
    course_offering_id: courseOfferingId,
  });

  if (insErr) {
    // If duplicate, treat as success
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, already_enrolled: true });
    }
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<RouteParams> | RouteParams }
): Promise<NextResponse> {
  const guard = await requireStudentAccess();
  if ("error" in guard) return guard.error;

  const supabase = await createClient();
  const { user } = guard;

  const params = await readParams(ctx);
  const courseOfferingId = params.courseOfferingId?.trim() ?? "";

  if (!courseOfferingId) {
    return NextResponse.json({ error: "Missing courseOfferingId" }, { status: 400 });
  }

  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("student_id", user.student_id)
    .eq("course_offering_id", courseOfferingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
