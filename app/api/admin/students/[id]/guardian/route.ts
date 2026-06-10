import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface GuardianUpdateBody {
  guardian_first_name?: unknown;
  guardian_last_name?: unknown;
  guardian_phone?: unknown;
  guardian_status?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseOptionalText(
  value: unknown,
  fieldName: string,
  maximumLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be text.`);
  }

  const normalized = value.trim();

  return normalized
    ? normalized.slice(0, maximumLength)
    : null;
}

async function verifyAdministrator(): Promise<
  | {
      authorized: true;
    }
  | {
      authorized: false;
      response: NextResponse;
    }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, main_role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Guardian administrator verification error:",
      profileError,
    );

    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Failed to verify administrator." },
        { status: 500 },
      ),
    };
  }

  const allowedRoles = new Set([
    "admin",
    "administrator",
    "super_admin",
  ]);

  if (
    !profile ||
    !allowedRoles.has(String(profile.main_role))
  ) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error:
            "You are not allowed to edit guardian information.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    authorized: true,
  };
}

/* ------------------------------------------------ */
/* GET GUARDIAN INFORMATION                         */
/* ------------------------------------------------ */

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id: studentId } = await context.params;

    if (!isUuid(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID." },
        { status: 400 },
      );
    }

    const authorization = await verifyAdministrator();

    if (!authorization.authorized) {
      return authorization.response;
    }

    const { data: guardian, error } =
      await supabaseAdmin
        .from("students")
        .select(`
          guardian_first_name,
          guardian_last_name,
          guardian_phone,
          guardian_status
        `)
        .eq("id", studentId)
        .is("archived_at", null)
        .maybeSingle();

    if (error) {
      console.error(
        "Guardian information load error:",
        error,
      );

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    if (!guardian) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      guardian,
    });
  } catch (error) {
    console.error(
      "Unexpected GET guardian information error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load guardian information.",
      },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------ */
/* PATCH GUARDIAN INFORMATION                       */
/* ------------------------------------------------ */

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id: studentId } = await context.params;

    if (!isUuid(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID." },
        { status: 400 },
      );
    }

    const authorization = await verifyAdministrator();

    if (!authorization.authorized) {
      return authorization.response;
    }

    let body: GuardianUpdateBody;

    try {
      body =
        (await request.json()) as GuardianUpdateBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const updates: Record<string, string | null> = {};

    const guardianFirstName = parseOptionalText(
      body.guardian_first_name,
      "Guardian first name",
      150,
    );

    const guardianLastName = parseOptionalText(
      body.guardian_last_name,
      "Guardian last name",
      150,
    );

    const guardianPhone = parseOptionalText(
      body.guardian_phone,
      "Guardian phone",
      30,
    );

    const guardianRelationship = parseOptionalText(
      body.guardian_status,
      "Guardian relationship",
      100,
    );

    if (guardianFirstName !== undefined) {
      updates.guardian_first_name =
        guardianFirstName;
    }

    if (guardianLastName !== undefined) {
      updates.guardian_last_name =
        guardianLastName;
    }

    if (guardianPhone !== undefined) {
      updates.guardian_phone = guardianPhone;
    }

    if (guardianRelationship !== undefined) {
      updates.guardian_status =
        guardianRelationship;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid guardian fields were provided.",
        },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedGuardian, error } =
      await supabaseAdmin
        .from("students")
        .update(updates)
        .eq("id", studentId)
        .is("archived_at", null)
        .select(`
          guardian_first_name,
          guardian_last_name,
          guardian_phone,
          guardian_status
        `)
        .maybeSingle();

    if (error) {
      console.error(
        "Guardian information update error:",
        error,
      );

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    if (!updatedGuardian) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message:
        "Guardian information updated successfully.",
      guardian: updatedGuardian,
    });
  } catch (error) {
    console.error(
      "Unexpected PATCH guardian information error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update guardian information.",
      },
      { status: 500 },
    );
  }
}