import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MainRole = "admin" | "student" | "academic_staff" | "non_academic_staff";
type StaffUnit = "admissions" | "bursary" | "exams";

type GuardUser = {
  id: string;
  main_role: MainRole;
  // only for non_academic_staff
  unit?: StaffUnit | null;
};

type GuardOk = { user: GuardUser };
type GuardErr = { error: NextResponse };

type ProfileRow = { id: string; main_role: MainRole | null };
type StaffRow = { unit: StaffUnit | null };

export async function requireExamsAccess(): Promise<GuardOk | GuardErr> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, main_role")
    .eq("id", data.user.id)
    .maybeSingle<ProfileRow>();

  if (profErr || !profile?.main_role) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  // Admin always allowed
  if (profile.main_role === "admin") {
    return { user: { id: profile.id, main_role: "admin" } };
  }

  // Academic staff allowed (assignment filtering happens in the API query)
  if (profile.main_role === "academic_staff") {
    return { user: { id: profile.id, main_role: "academic_staff" } };
  }

  // Non-academic must be in exams unit (unit is stored in staff table)
  if (profile.main_role === "non_academic_staff") {
    const { data: staff, error: staffErr } = await supabase
      .from("staff")
      .select("unit")
      .eq("profile_id", profile.id)
      .maybeSingle<StaffRow>();

    if (staffErr) {
      return {
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    if (staff?.unit !== "exams") {
      return {
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return {
      user: { id: profile.id, main_role: "non_academic_staff", unit: "exams" },
    };
  }

  // Students (and anything else) blocked
  return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}
