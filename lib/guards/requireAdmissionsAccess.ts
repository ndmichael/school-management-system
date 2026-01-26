import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  main_role: string | null;
};

type StaffRow = {
  unit: string | null;
};

export async function requireAdmissionsAccess(): Promise<
  | { userId: string; role: string; unit: string | null }
  | { error: NextResponse }
> {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const userId = auth?.user?.id ?? null;

  if (authErr || !userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Load profile role
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, main_role")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (profErr || !profile?.id) {
    return {
      error: NextResponse.json({ error: "Profile not found" }, { status: 403 }),
    };
  }

  const role = profile.main_role ?? "";

  // Admins always allowed
  if (role === "admin") {
    return { userId, role, unit: null };
  }

  // Non-academic staff must be in admissions unit
  if (role === "non_academic_staff") {
    const { data: staff, error: staffErr } = await supabase
      .from("staff")
      .select("unit")
      .eq("profile_id", userId)
      .maybeSingle<StaffRow>();

    if (staffErr) {
      return {
        error: NextResponse.json({ error: staffErr.message }, { status: 400 }),
      };
    }

    const unit = staff?.unit ?? null;
    if (unit !== "admissions") {
      return {
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return { userId, role, unit };
  }

  return {
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}
