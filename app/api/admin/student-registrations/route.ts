import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAccess } from "@/lib/guards/requireAdminAccess";

type RegistrationStatus = "registered" | "deferred";

type RequestBody = {
  student_id?: unknown;
  session_id?: unknown;
  level?: unknown;
  status?: unknown;
};

type RegistrationResult = {
  registration_id: string;
  student_id: string;
  session_id: string;
  level: string | null;
  status: RegistrationStatus;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeOptionalString(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function isRegistrationStatus(
  value: unknown
): value is RegistrationStatus {
  return value === "registered" || value === "deferred";
}

function getPostgresErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const guard = await requireAdminAccess();

  if ("error" in guard) {
    return guard.error;
  }

  let body: RequestBody;

  // Validate input body
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // Check each body individually
  if (!isNonEmptyString(body.student_id)) {
    return NextResponse.json(
      { error: "Student is required." },
      { status: 422 }
    );
  }

  if (!isNonEmptyString(body.session_id)) {
    return NextResponse.json(
      { error: "Academic session is required." },
      { status: 422 }
    );
  }

  const status =
    body.status === undefined
      ? "registered"
      : body.status;

  if (!isRegistrationStatus(status)) {
    return NextResponse.json(
      {
        error:
          "Registration status must be registered or deferred.",
      },
      { status: 422 }
    );
  }

  const level = normalizeOptionalString(body.level);

  // Supabase postgres RPC is called here
  const { data, error } = await supabaseAdmin.rpc(
    "register_student_for_session",
    {
      p_student_id: body.student_id.trim(),
      p_session_id: body.session_id.trim(),
      p_level: level,
      p_status: status,
    }
  );

  // Get postgres error codes and 
  // return the appropriate readable code to the ui
  if (error) {
    const code = getPostgresErrorCode(error);

    if (code === "23505") {
      return NextResponse.json(
        {
          error:
            "This student is already registered for the selected session.",
        },
        { status: 409 }
      );
    }

    if (code === "P0002") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (code === "22023") {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      );
    }

    // update console error for debugging
    console.error(
      "POST /api/admin/student-registrations failed:",
      error
    );

    return NextResponse.json(
      { error: "Failed to register student for session." },
      { status: 500 }
    );
  }

  const registration = Array.isArray(data)
    ? (data[0] as RegistrationResult | undefined)
    : undefined;

  if (!registration) {
    return NextResponse.json(
      { error: "Registration result was not returned." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { registration },
    { status: 201 }
  );
}