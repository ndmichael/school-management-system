import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  main_role: string | null;
};

type StaffRow = {
  unit: string | null;
};

export async function requireAdminOrBursary() {
  const supabase = await createClient();

  // 1. Confirm that the request belongs to a logged-in user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      ),
    };
  }

  // 2. Load the user's main role from their profile.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("main_role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) {
    return {
      error: NextResponse.json(
        { error: "User profile not found." },
        { status: 401 }
      ),
    };
  }

  // 3. Administrators are allowed immediately.
  if (profile.main_role === "admin") {
    return {
      userId: user.id,
      role: "admin" as const,
      unit: null,
    };
  }

  // 4. Other roles are rejected before checking the staff table.
  if (profile.main_role !== "non_academic_staff") {
    return {
      error: NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      ),
    };
  }

  // 5. Find the non-academic staff member's unit.
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("unit")
    .eq("profile_id", user.id)
    .maybeSingle<StaffRow>();

  if (staffError || !staff) {
    return {
      error: NextResponse.json(
        { error: "Staff record not found." },
        { status: 403 }
      ),
    };
  }

  // Normalize the value so "Bursary", " bursary " and "BURSARY"
  // are all treated the same.
  const normalizedUnit = staff.unit?.trim().toLowerCase();

  if (normalizedUnit !== "bursary") {
    return {
      error: NextResponse.json(
        {
          error:
            "Only administrators and bursary staff can access this resource.",
        },
        { status: 403 }
      ),
    };
  }

  // 6. The user is a valid bursary staff member.
  return {
    userId: user.id,
    role: "non_academic_staff" as const,
    unit: "bursary" as const,
  };
}