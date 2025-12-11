import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log("🔥 PROFILE GET ROUTE HIT");

  const { id } = await context.params; // ← REQUIRED IN NEXT.JS 14
  console.log("🔥 Extracted studentId:", id);

  if (!id) {
    return NextResponse.json({ error: "Missing student id." }, { status: 400 });
  }

  // Get student + profile relation
  const { data, error } = await supabaseAdmin
    .from("students")
    .select(
      `
      profile_id,
      profiles (
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
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Profile load error:", error);
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  return NextResponse.json({ profile: data.profiles });
}

// -----------------------------------------------------------
// PATCH — Update student profile
// -----------------------------------------------------------

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log("🔥 PROFILE PATCH ROUTE HIT");

  const { id } = await context.params; // ← REQUIRED
  console.log("🔥 Extracted studentId:", id);

  if (!id) {
    return NextResponse.json({ error: "Missing student id." }, { status: 400 });
  }

  const updates = await req.json();

  // First get the profile_id for this student
  const { data: student, error: studentErr } = await supabaseAdmin
    .from("students")
    .select("profile_id")
    .eq("id", id)
    .single();

  if (studentErr || !student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  // Now update the profile
  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", student.profile_id);

  if (updateErr) {
    console.error("Profile update error:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
