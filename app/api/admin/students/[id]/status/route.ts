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

type StudentStatus =
  (typeof STUDENT_STATUSES)[number];

interface StatusRequestBody {
  status?: unknown;
  reason?: unknown;
}

function isStudentStatus(
  value: unknown,
): value is StudentStatus {
  return (
    typeof value === "string" &&
    STUDENT_STATUSES.includes(
      value.toLowerCase().trim() as StudentStatus,
    )
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getRpcErrorResponse(error: {
  message?: string;
}) {
  const message =
    error.message ?? "Failed to update student status.";

  if (message.includes("Student not found")) {
    return NextResponse.json(
      { error: "Student not found." },
      { status: 404 },
    );
  }

  if (
    message.includes(
      "Student already has this status",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "The student already has the selected status.",
      },
      { status: 409 },
    );
  }

  if (
    message.includes(
      "Only administrators can change student status",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "You are not authorized to change student status.",
      },
      { status: 403 },
    );
  }

  if (
    message.includes("Invalid student status") ||
    message.includes("A valid reason is required")
  ) {
    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }

  console.error(
    "[CHANGE_STUDENT_STATUS_RPC_ERROR]",
    error,
  );

  return NextResponse.json(
    {
      error: "Failed to update student status.",
    },
    { status: 500 },
  );
}

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id: studentId } = await context.params;

  if (!isUuid(studentId)) {
    return NextResponse.json(
      { error: "Invalid student ID." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("main_role")
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.main_role !== "admin"
  ) {
    return NextResponse.json(
      {
        error:
          "You are not authorized to change student status.",
      },
      { status: 403 },
    );
  }

  const body = (await req
    .json()
    .catch(() => null)) as StatusRequestBody | null;

  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!isStudentStatus(body.status)) {
    return NextResponse.json(
      {
        error: "Invalid student status.",
        allowed_statuses: STUDENT_STATUSES,
      },
      { status: 400 },
    );
  }

  if (
    typeof body.reason !== "string" ||
    body.reason.trim().length < 3
  ) {
    return NextResponse.json(
      {
        error:
          "A reason of at least 3 characters is required.",
      },
      { status: 400 },
    );
  }

  const newStatus = body.status
    .toLowerCase()
    .trim() as StudentStatus;

  const reason = body.reason.trim();

  const { data, error } = await supabaseAdmin.rpc(
    "change_student_status",
    {
      p_student_id: studentId,
      p_new_status: newStatus,
      p_reason: reason,
      p_actor_id: user.id,
    },
  );

  if (error) {
    return getRpcErrorResponse(error);
  }

  return NextResponse.json({
    success: true,
    message: "Student status updated successfully.",
    student: data,
  });
}