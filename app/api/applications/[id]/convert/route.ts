import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔥 CONVERT ROUTE HIT");

    const { id: applicationId } = await context.params;
    console.log("🔥 Extracted applicationId:", applicationId);

    if (!applicationId) {
      return NextResponse.json(
        { error: "Missing application id." },
        { status: 400 }
      );
    }

    // 1️⃣ Load full application including ALL profile + guardian fields
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

        state_of_origin,
        lga_of_origin,
        nin,
        religion,
        address,

        guardian_first_name,
        guardian_last_name,
        guardian_phone,
        guardian_status,

        program_id,
        department_id,
        session_id
      `)
      .eq("id", applicationId)
      .single();

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

    // 2️⃣ Program → get program code
    const { data: program } = await supabaseAdmin
      .from("programs")
      .select("code")
      .eq("id", app.program_id)
      .single();

    if (!program?.code) {
      return NextResponse.json({ error: "Program not found." }, { status: 400 });
    }

    // 3️⃣ Session → extract year
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("name")
      .eq("id", app.session_id)
      .single();

    if (!session?.name) {
      return NextResponse.json({ error: "Session not found." }, { status: 400 });
    }

    const [startYear] = session.name.split("/");
    const yy = startYear.slice(-2);

    // 4️⃣ Generate student sequence number
    const { count: seqCount } = await supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("program_id", app.program_id)
      .like("matric_no", `%/${yy}/%`);

    const nextSeq = String((seqCount ?? 0) + 1).padStart(4, "0");

    // 5️⃣ Build matric number
    const matricNo = `SYK/${program.code}/${yy}/${nextSeq}`;

    // 6️⃣ Create Auth user
    const tempPassword = Math.random().toString(36).slice(-10);
    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: app.email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authErr || !authUser.user) {
      return NextResponse.json(
        { error: "Failed to create auth user." },
        { status: 400 }
      );
    }

    // 7️⃣ Create Profile (NOW INCLUDES ALL FIELDS)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authUser.user.id,
        first_name: app.first_name,
        middle_name: app.middle_name,
        last_name: app.last_name,
        email: app.email,
        phone: app.phone,
        gender: app.gender,
        date_of_birth: app.date_of_birth,
        state_of_origin: app.state_of_origin,
        lga_of_origin: app.lga_of_origin,
        nin: app.nin,
        religion: app.religion,
        address: app.address,
        main_role: "student",
      })
      .select()
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Failed to create profile." },
        { status: 400 }
      );
    }

    // 8️⃣ Create Student (NOW INCLUDES GUARDIAN FIELDS)
    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .insert({
        profile_id: profile.id,
        program_id: app.program_id,
        department_id: app.department_id,
        course_session_id: app.session_id,
        matric_no: matricNo,
        level: null,
        status: "active",
        enrollment_date: new Date().toISOString().slice(0, 10),

        guardian_first_name: app.guardian_first_name,
        guardian_last_name: app.guardian_last_name,
        guardian_phone: app.guardian_phone,
        guardian_status: app.guardian_status,
      })
      .select()
      .single();

    if (studentErr || !student) {
      return NextResponse.json(
        { error: "Failed to create student." },
        { status: 400 }
      );
    }

    // 9️⃣ Mark application as converted
    const { error: updateErr } = await supabaseAdmin
      .from("applications")
      .update({
        converted_to_student: true,
        student_id: student.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateErr) {
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
