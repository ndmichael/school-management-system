// lib/guards/requireStudentAccess.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MainRole = "admin" | "student" | "academic_staff" | "non_academic_staff";

type StudentRow = {
  id: string;
  profile_id: string;
  program_id: string | null;
  level: string | null;
  status: string | null;
};

type GuardUser = {
  profile_id: string; // auth user id == profiles.id
  student_id: string; // students.id
  program_id: string | null;
  level: string | null;
  status: string | null;
};

type GuardOk = { user: GuardUser };
type GuardErr = { error: NextResponse };

type ProfileRow = { id: string; main_role: MainRole | null };

export async function requireStudentAccess(): Promise<GuardOk | GuardErr> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, main_role")
    .eq("id", data.user.id)
    .maybeSingle<ProfileRow>();

  if (profErr || !profile?.main_role) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (profile.main_role !== "student") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: student, error: stErr } = await supabase
    .from("students")
    .select("id, profile_id, program_id, level, status")
    .eq("profile_id", profile.id)
    .maybeSingle<StudentRow>();

  if (stErr || !student) {
    return { error: NextResponse.json({ error: "Student record not found" }, { status: 404 }) };
  }

  // Optional: block inactive students
  if (student.status && student.status !== "active") {
    return { error: NextResponse.json({ error: "Student is not active" }, { status: 403 }) };
  }

  return {
    user: {
      profile_id: profile.id,
      student_id: student.id,
      program_id: student.program_id,
      level: student.level,
      status: student.status,
    },
  };
}
