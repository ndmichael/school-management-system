import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const STUDENT_STATUSES = [
  "active",
  "suspended",
  "dismissed",
  "withdrawn",
  "graduated",
] as const;

type StudentStatus = (typeof STUDENT_STATUSES)[number];

type RequestBody = {
  status?: unknown;
};

function isStudentStatus(value: unknown): value is StudentStatus {
  return (
    typeof value === "string" &&
    STUDENT_STATUSES.includes(value as StudentStatus)
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;

  if (!isUuid(studentId)) {
    return NextResponse.json(
      { error: "Invalid student ID." },
      { status: 400 }
    );
  }

  /*
    Confirm that the requester is signed in.
  */
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  /*
    Only administrators may change student status.
  */
  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("main_role")
      .eq("id", user.id)
      .single<{ main_role: string | null }>();

  if (
    profileError ||
    !profile ||
    profile.main_role !== "admin"
  ) {
    return NextResponse.json(
      { error: "You are not authorized to change student status." },
      { status: 403 }
    );
  }

  const body: RequestBody = await req.json().catch(() => ({}));

  if (!isStudentStatus(body.status)) {
    return NextResponse.json(
      {
        error: "Invalid student status.",
        allowed_statuses: STUDENT_STATUSES,
      },
      { status: 400 }
    );
  }

  /*
    Update the existing student record.

    The [id] parameter is the students table row ID,
    not the profile ID.
  */
  const { data: student, error: updateError } =
    await supabaseAdmin
      .from("students")
      .update({
        status: body.status,
      })
      .eq("id", studentId)
      .select("id, status")
      .maybeSingle<{
        id: string;
        status: StudentStatus;
      }>();

  if (updateError) {
    console.error(
      "[UPDATE_STUDENT_STATUS_ERROR]",
      updateError
    );

    return NextResponse.json(
      { error: "Failed to update student status." },
      { status: 500 }
    );
  }

  if (!student) {
    return NextResponse.json(
      { error: "Student not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    student,
  });
}