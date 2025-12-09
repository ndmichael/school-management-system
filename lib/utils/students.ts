// src/lib/utils/students.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function findStudentByProfileId(profileId: string) {
  const { data, error } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
}

export function generateMatricNo() {
  return `STU-${new Date().getFullYear()}-${Math.random()
    .toString(36)
    .slice(-4)
    .toUpperCase()}`;
}

export async function createStudent(profileId: string, app: any) {
  const matricNo = generateMatricNo();

  const { data, error } = await supabaseAdmin
    .from("students")
    .insert({
      profile_id: profileId,
      matric_no: matricNo,
      program_id: app.program_id ?? null,
      department_id: null,
      level: app.class_applied_for ?? null,
      course_session_id: app.session_id ?? null,
      cgpa: null,
      enrollment_date: new Date().toISOString().slice(0, 10),
      guardian_first_name: null,
      guardian_last_name: null,
      guardian_phone: null,
      guardian_status: null,
      status: "active",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create student");
  }

  return data;
}

export async function ensureStudentExists(profileId: string, application: any) {
  const student = await findStudentByProfileId(profileId);

  if (student) return { id: student.id, created: false };

  const newStudent = await createStudent(profileId, application);
  return { id: newStudent.id, created: true };
}
