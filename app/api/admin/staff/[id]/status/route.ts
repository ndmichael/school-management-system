import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const STAFF_STATUSES = [
  "active",
  "suspended",
  "resigned",
  "terminated",
  "retired",
] as const;

type StaffStatus = (typeof STAFF_STATUSES)[number];

interface StatusRequestBody {
  status?: unknown;
  reason?: unknown;
}

function isStaffStatus(
  value: unknown,
): value is StaffStatus {
  return (
    typeof value === "string" &&
    STAFF_STATUSES.includes(
      value.toLowerCase().trim() as StaffStatus,
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
    error.message ?? "Failed to update staff status.";

  if (message.includes("Staff member not found")) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 },
    );
  }

  if (
    message.includes(
      "Staff member already has this status",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "The staff member already has the selected status.",
      },
      { status: 409 },
    );
  }

  if (
    message.includes(
      "Only administrators can change staff status",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "You are not authorized to change staff status.",
      },
      { status: 403 },
    );
  }

  if (
    message.includes("Invalid staff status") ||
    message.includes("A valid reason is required")
  ) {
    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }

  console.error(
    "[CHANGE_STAFF_STATUS_RPC_ERROR]",
    error,
  );

  return NextResponse.json(
    {
      error: "Failed to update staff status.",
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
  const { id: staffId } = await context.params;

  if (!isUuid(staffId)) {
    return NextResponse.json(
      { error: "Invalid staff ID." },
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
          "You are not authorized to change staff status.",
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

  if (!isStaffStatus(body.status)) {
    return NextResponse.json(
      {
        error: "Invalid staff status.",
        allowed_statuses: STAFF_STATUSES,
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
    .trim() as StaffStatus;

  const reason = body.reason.trim();

  const { data, error } = await supabaseAdmin.rpc(
    "change_staff_status",
    {
      p_staff_id: staffId,
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
    message: "Staff status updated successfully.",
    staff: data,
  });
}