import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ConvertParams = { id: string };

export async function POST(
  _req: Request,
  context: { params: Promise<ConvertParams> }
) {
  let createdAuthUserId: string | null = null;

  try {
    const { id: applicationId } = await context.params;

    if (!applicationId) {
      return NextResponse.json({ error: "Missing application id." }, { status: 400 });
    }

    // 1) Load application
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
      return NextResponse.json({ error: appErr?.message ?? "Application not found." }, { status: 404 });
    }

    if (app.status !== "accepted") {
      return NextResponse.json({ error: "Application must be accepted before conversion." }, { status: 400 });
    }

    if (app.converted_to_student) {
      return NextResponse.json({ error: "Application already converted." }, { status: 400 });
    }

    const email = String(app.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Application email is missing." }, { status: 400 });
    }

    // ==========================
    // A) 409 pre-check (Auth exists)
    // ==========================
    // Supabase JS Admin API doesn't have getUserByEmail in some versions,
    // so we do a safe pre-check via profiles table (email is NOT NULL in your schema).
    // If you also enforce unique email on profiles, this is strong.
    const { data: existingProfile, error: profCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profCheckErr) {
      return NextResponse.json({ error: profCheckErr.message }, { status: 400 });
    }
    if (existingProfile?.id) {
      return NextResponse.json(
        { error: "A user with this email already exists. Resolve the existing account first." },
        { status: 409 }
      );
    }

    // 2) Program code
    const { data: program, error: programErr } = await supabaseAdmin
      .from("programs")
      .select("code")
      .eq("id", app.program_id)
      .single();

    if (programErr || !program?.code) {
      return NextResponse.json({ error: programErr?.message ?? "Program not found." }, { status: 400 });
    }

    // 3) Session year segment
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("sessions")
      .select("name")
      .eq("id", app.session_id)
      .single();

    if (sessionErr || !session?.name) {
      return NextResponse.json({ error: sessionErr?.message ?? "Session not found." }, { status: 400 });
    }

    const [startYear] = String(session.name).split("/");
    const yy = String(startYear).slice(-2);

    // ==========================
    // Collision-safe matric (DB function w/ advisory lock)
    // ==========================
    const { data: matricNo, error: matricErr } = await supabaseAdmin.rpc(
      "generate_student_matric_no",
      {
        p_program_id: app.program_id,
        p_program_code: program.code,
        p_yy: yy,
      }
    );

    if (matricErr || !matricNo) {
      return NextResponse.json(
        { error: matricErr?.message ?? "Failed to generate matric number." },
        { status: 400 }
      );
    }

    // 4) Create auth user (pending/confirmed choice)
    const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // keep false until you add invite/reset flow
      user_metadata: { onboarding_status: "pending", main_role: "student" },
    });

    if (authErr || !authUser.user) {
      return NextResponse.json({ error: authErr?.message ?? "Failed to create auth user." }, { status: 400 });
    }

    createdAuthUserId = authUser.user.id;

    // 5) Create profile
    const { data: profile, error: profileErr2 } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdAuthUserId,
        first_name: app.first_name,
        middle_name: app.middle_name,
        last_name: app.last_name,
        email,
        phone: app.phone,
        gender: app.gender,
        date_of_birth: app.date_of_birth,
        state_of_origin: app.state_of_origin,
        lga_of_origin: app.lga_of_origin,
        nin: app.nin,
        religion: app.religion,
        address: app.address,
        main_role: "student",
        // onboarding_status: "pending" // only if you added this column
      })
      .select("id")
      .single();

    if (profileErr2 || !profile) {
      // B) Cleanup consistency: remove auth user if profile fails
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;

      return NextResponse.json({ error: profileErr2?.message ?? "Failed to create profile." }, { status: 400 });
    }

    // 6) Create student
    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .insert({
        profile_id: profile.id,
        program_id: app.program_id,
        department_id: app.department_id,
        course_session_id: app.session_id,
        matric_no: String(matricNo),
        level: null,
        status: "active",
        enrollment_date: new Date().toISOString().slice(0, 10),

        guardian_first_name: app.guardian_first_name,
        guardian_last_name: app.guardian_last_name,
        guardian_phone: app.guardian_phone,
        guardian_status: app.guardian_status,
      })
      .select("id, matric_no")
      .single();

    if (studentErr || !student) {
      // B) Cleanup consistency: remove profile + auth user if student fails
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      createdAuthUserId = null;

      return NextResponse.json({ error: studentErr?.message ?? "Failed to create student." }, { status: 400 });
    }

    // 7) Mark application converted
    const { error: updateErr } = await supabaseAdmin
      .from("applications")
      .update({
        converted_to_student: true,
        student_id: student.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateErr) {
      // If this fails, you can decide whether to cleanup or leave student created.
      // Production option: keep student created and surface error for manual fix.
      return NextResponse.json(
        { error: `Student created but failed to update application: ${updateErr.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      studentId: student.id,
      matricNo: student.matric_no,
      tempPassword, // show to admin for now; later replace with invite/reset link
    });
  } catch (err) {
    // last resort cleanup if auth created but something threw
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    console.error("🔥 Convert API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
