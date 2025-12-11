import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔥 CONVERT ROUTE HIT");

    // Next.js 14: params is a Promise
    const { id: applicationId } = await context.params;
    console.log("🔥 Extracted applicationId:", applicationId);

    if (!applicationId) {
      return NextResponse.json(
        { error: "Missing application id." },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch application with required fields
    const { data: app, error: appErr } = await supabaseAdmin
      .from("applications")
      .select(`
        id,
        status,
        converted_to_student,
        student_id,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        gender,
        date_of_birth,
        program_id,
        department_id,
        session_id
      `)
      .eq("id", applicationId)
      .single();

    console.log("🔥 Loaded application:", app);

    if (appErr || !app) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (app.status !== "accepted") {
      return NextResponse.json(
        { error: "Application must be accepted before conversion." },
        { status: 400 }
      );
    }

    if (app.converted_to_student) {
      return NextResponse.json(
        { error: "Application already converted." },
        { status: 400 }
      );
    }

    // 2️⃣ Fetch program for program code
    const { data: program } = await supabaseAdmin
      .from("programs")
      .select("code")
      .eq("id", app.program_id)
      .single();

    if (!program?.code) {
      return NextResponse.json({ error: "Program not found." }, { status: 400 });
    }

    // 3️⃣ Fetch session for year parsing
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("name")
      .eq("id", app.session_id)
      .single();

    if (!session?.name) {
      return NextResponse.json({ error: "Session not found." }, { status: 400 });
    }

    const sessionName = session.name; // "2024/2025"
    const [startYear] = sessionName.split("/");
    const yy = startYear.slice(-2); // → "24"

    // 4️⃣ Generate sequence number
    const { count: seqCount } = await supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("program_id", app.program_id)
      .like("matric_no", `%/${yy}/%`);

    const nextSeq = String((seqCount ?? 0) + 1).padStart(4, "0");

    // 5️⃣ Build matric number
    const matricNo = `SYK/${program.code}/${yy}/${nextSeq}`;
    console.log("🔥 Generated matric:", matricNo);

    // 6️⃣ Create Supabase Auth user
    const tempPassword = Math.random().toString(36).slice(-10);

    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: app.email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authErr || !authUser.user) {
      console.log("🔥 Auth error:", authErr);
      return NextResponse.json(
        { error: "Failed to create auth user." },
        { status: 400 }
      );
    }

    // 7️⃣ Create profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authUser.user.id, // match auth user id
        first_name: app.first_name,
        middle_name: app.middle_name,
        last_name: app.last_name,
        email: app.email,
        phone: app.phone,
        gender: app.gender,
        date_of_birth: app.date_of_birth,
        main_role: "student",
      })
      .select()
      .single();

    if (profileErr || !profile) {
      console.log("🔥 Profile error:", profileErr);
      return NextResponse.json(
        { error: "Failed to create profile." },
        { status: 400 }
      );
    }

    // 8️⃣ Create student record
    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .insert({
        profile_id: profile.id,
        program_id: app.program_id,
        department_id: app.department_id,
        course_session_id: app.session_id,
        matric_no: matricNo,
        status: "active",
        enrollment_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (studentErr || !student) {
      console.log("🔥 Student error:", studentErr);
      return NextResponse.json(
        { error: "Failed to create student." },
        { status: 400 }
      );
    }

    // 9️⃣ Update application
    const { error: updateErr } = await supabaseAdmin
      .from("applications")
      .update({
        converted_to_student: true,
        student_id: student.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateErr) {
      console.log("🔥 Application update error:", updateErr);
      return NextResponse.json(
        { error: updateErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      studentId: student.id,
      matricNo,
      tempPassword,
    });
  } catch (error) {
    console.error("🔥 Convert API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
