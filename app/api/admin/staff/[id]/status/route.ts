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

type RequestBody = {
  status?: unknown;
};

function isStaffStatus(value: unknown): value is StaffStatus {
  return (
    typeof value === "string" &&
    STAFF_STATUSES.includes(value as StaffStatus)
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
  const { id: staffId } = await context.params;

  if (!isUuid(staffId)) {
    return NextResponse.json(
      { error: "Invalid staff ID." },
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
    Only administrators may change staff status.
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
      { error: "You are not authorized to change staff status." },
      { status: 403 }
    );
  }

  const body: RequestBody = await req.json().catch(() => ({}));

  if (!isStaffStatus(body.status)) {
    return NextResponse.json(
      {
        error: "Invalid staff status.",
        allowed_statuses: STAFF_STATUSES,
      },
      { status: 400 }
    );
  }

  /*
    Update the existing staff record.

    The [id] parameter is the staff table row ID,
    not the profile ID.
  */
  const { data: staff, error: updateError } =
    await supabaseAdmin
      .from("staff")
      .update({
        status: body.status,
      })
      .eq("id", staffId)
      .select("id, status")
      .maybeSingle<{
        id: string;
        status: StaffStatus;
      }>();

  if (updateError) {
    console.error(
      "[UPDATE_STAFF_STATUS_ERROR]",
      updateError
    );

    return NextResponse.json(
      { error: "Failed to update staff status." },
      { status: 500 }
    );
  }

  if (!staff) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    staff,
  });
}