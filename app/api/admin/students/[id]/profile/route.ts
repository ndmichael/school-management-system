import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface ProfileUpdateBody {
  first_name?: unknown;
  middle_name?: unknown;
  last_name?: unknown;
  phone?: unknown;
  date_of_birth?: unknown;
  gender?: unknown;
  nin?: unknown;
  address?: unknown;
  state_of_origin?: unknown;
  lga_of_origin?: unknown;
  religion?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function requiredText(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim().slice(0, 150);
}

function optionalText(
  value: unknown,
  maximumLength = 255,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();

  return normalized
    ? normalized.slice(0, maximumLength)
    : null;
}

function optionalDate(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(value)) {
    throw new Error(
      "Date of birth must use YYYY-MM-DD format.",
    );
  }

  return value;
}

async function verifyAdministrator() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      ),
      profileId: null,
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
      "Administrator verification error:",
      profileError,
    );

    return {
      error: NextResponse.json(
        { error: "Failed to verify administrator." },
        { status: 500 },
      ),
      profileId: null,
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
      error: NextResponse.json(
        {
          error:
            "You are not allowed to edit student profiles.",
        },
        { status: 403 },
      ),
      profileId: null,
    };
  }

  return {
    error: null,
    profileId: profile.id,
  };
}

/* ------------------------------------------------ */
/* GET STUDENT PROFILE                              */
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

    if (authorization.error) {
      return authorization.error;
    }

    const { data, error } = await supabaseAdmin
      .from("students")
      .select(`
        profile_id,

        profiles:profiles!students_profile_id_fkey (
          first_name,
          middle_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          nin,
          address,
          state_of_origin,
          lga_of_origin,
          religion
        )
      `)
      .eq("id", studentId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) {
      console.error("Profile load error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );
    }

    const profile = Array.isArray(data.profiles)
      ? data.profiles[0] ?? null
      : data.profiles;

    if (!profile) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error(
      "Unexpected GET student profile error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load student profile.",
      },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------ */
/* PATCH STUDENT PROFILE                            */
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

    if (authorization.error) {
      return authorization.error;
    }

    let body: ProfileUpdateBody;

    try {
      body = (await request.json()) as ProfileUpdateBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const { data: student, error: studentError } =
      await supabaseAdmin
        .from("students")
        .select("profile_id")
        .eq("id", studentId)
        .is("archived_at", null)
        .maybeSingle();

    if (studentError) {
      console.error(
        "Student profile lookup error:",
        studentError,
      );

      return NextResponse.json(
        { error: studentError.message },
        { status: 400 },
      );
    }

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );
    }

    const updates: Record<string, string | null> = {};

    if (body.first_name !== undefined) {
      updates.first_name = requiredText(
        body.first_name,
        "First name",
      );
    }

    if (body.middle_name !== undefined) {
      updates.middle_name =
        optionalText(body.middle_name, 150) ?? null;
    }

    if (body.last_name !== undefined) {
      updates.last_name = requiredText(
        body.last_name,
        "Last name",
      );
    }

    const optionalFields = {
      phone: optionalText(body.phone, 30),
      gender: optionalText(body.gender, 30),
      nin: optionalText(body.nin, 50),
      address: optionalText(body.address, 500),
      state_of_origin: optionalText(
        body.state_of_origin,
        100,
      ),
      lga_of_origin: optionalText(
        body.lga_of_origin,
        100,
      ),
      religion: optionalText(body.religion, 100),
      date_of_birth: optionalDate(body.date_of_birth),
    };

    for (const [key, value] of Object.entries(
      optionalFields,
    )) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid profile fields were provided." },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedProfile, error: updateError } =
      await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", student.profile_id)
        .select(`
          first_name,
          middle_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          nin,
          address,
          state_of_origin,
          lga_of_origin,
          religion
        `)
        .maybeSingle();

    if (updateError) {
      console.error(
        "Profile update error:",
        updateError,
      );

      return NextResponse.json(
        { error: updateError.message },
        { status: 400 },
      );
    }

    if (!updatedProfile) {
      return NextResponse.json(
        { error: "Profile could not be updated." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Profile updated successfully.",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error(
      "Unexpected PATCH student profile error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update student profile.",
      },
      { status: 500 },
    );
  }
}