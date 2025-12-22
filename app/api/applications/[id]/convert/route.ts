import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ConvertParams = { id: string };

type StoredFile = { bucket: string; path: string };

type ApplicationRow = {
  id: string;
  status: string;
  converted_to_student: boolean;
  student_id: string | null;

  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;

  state_of_origin: string | null;
  lga_of_origin: string | null;
  nin: string | null;
  religion: string | null;
  address: string | null;

  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_status: string | null;

  program_id: string;
  department_id: string;
  session_id: string;

  passport_file: unknown; // jsonb from DB
};

type ProgramRow = { code: string };
type SessionRow = { name: string };
type ProfileIdRow = { id: string };
type StudentInsertReturn = { id: string; matric_no: string };

type JsonRecord = Record<string, unknown>;

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null;
}

function isStoredFile(v: unknown): v is StoredFile {
  if (!isRecord(v)) return false;
  return typeof v.bucket === "string" && typeof v.path === "string" && v.bucket.trim() !== "" && v.path.trim() !== "";
}

function isDuplicateAuthMessage(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already registered") ||
    m.includes("duplicate")
  );
}

function getBaseUrl(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";

  const isLocal = host.includes("localhost") || host.startsWith("127.0.0.1");
  const scheme = isLocal ? "http" : proto;

  return `${scheme}://${host}`;
}

export async function POST(req: Request, context: { params: Promise<ConvertParams> }) {
  let createdAuthUserId: string | null = null;

  try {
    const { id: applicationId } = await context.params;

    if (!applicationId) {
      return NextResponse.json({ error: "Missing application id." }, { status: 400 });
    }

    // 1) Load application (includes passport_file)
    const { data: app, error: appErr } = await supabaseAdmin
      .from("applications")
      .select(
        `
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
        session_id,

        passport_file
      `
      )
      .eq("id", applicationId)
      .single<ApplicationRow>();

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

    // ✅ Require passport_file to exist and be a valid {bucket,path}, because we will use it as avatar_file
    if (!isStoredFile(app.passport_file)) {
      return NextResponse.json(
        { error: "Application passport_file is missing or invalid. Cannot set student avatar." },
        { status: 400 }
      );
    }
    const avatarFile: StoredFile = app.passport_file;

    // 409 pre-check (profile exists by email)
    const { data: existingProfile, error: profCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle<ProfileIdRow>();

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
      .single<ProgramRow>();

    if (programErr || !program?.code) {
      return NextResponse.json({ error: programErr?.message ?? "Program not found." }, { status: 400 });
    }

    // 3) Session (kept because you may still use it elsewhere / auditing)
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("sessions")
      .select("name")
      .eq("id", app.session_id)
      .single<SessionRow>();

    if (sessionErr || !session?.name) {
      return NextResponse.json({ error: sessionErr?.message ?? "Session not found." }, { status: 400 });
    }

    // 4) Matric (RPC) — uses your current function signature: generate_student_matric_no(p_prefix text)
    const { data: matricNo, error: matricErr } = await supabaseAdmin.rpc("generate_student_matric_no", {
      p_prefix: program.code,
    });

    if (matricErr || !matricNo) {
      return NextResponse.json(
        { error: matricErr?.message ?? "Failed to generate matric number." },
        { status: 400 }
      );
    }

    // 5) Invite auth user (Supabase sends invite email)
    const redirectTo = new URL("/callback", getBaseUrl(req)).toString();

    const { data: inviteRes, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { onboarding_status: "pending", main_role: "student" },
      redirectTo,
    });

    if (inviteErr) {
      const msg = inviteErr.message ?? "Failed to invite auth user.";
      const isDup = isDuplicateAuthMessage(msg);

      return NextResponse.json(
        { error: isDup ? "User already exists" : msg },
        { status: isDup ? 409 : 400 }
      );
    }

    const invitedUserId = inviteRes?.user?.id ?? null;
    if (!invitedUserId) {
      return NextResponse.json({ error: "Invite succeeded but no user id returned." }, { status: 400 });
    }

    createdAuthUserId = invitedUserId;

    // 6) Create profile (✅ avatar_file copied from passport_file)
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
        onboarding_status: "pending",

        // ✅ HERE:
        avatar_file: avatarFile,
      })
      .select("id")
      .single<ProfileIdRow>();

    if (profileErr2 || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;

      return NextResponse.json({ error: profileErr2?.message ?? "Failed to create profile." }, { status: 400 });
    }

    // 7) Create student
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
      .single<StudentInsertReturn>();

    if (studentErr || !student) {
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      createdAuthUserId = null;

      return NextResponse.json({ error: studentErr?.message ?? "Failed to create student." }, { status: 400 });
    }

    // 8) Mark application converted
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
        { error: `Student created but failed to update application: ${updateErr.message}` },
        { status: 400 }
      );
    }

    // Optional: activate profile
    await supabaseAdmin.from("profiles").update({ onboarding_status: "active" }).eq("id", profile.id);

    return NextResponse.json({
      success: true,
      studentId: student.id,
      matricNo: student.matric_no,
      studentEmail: email,
      inviteQueued: true,
      redirectTo,
      avatarFile, // helpful for debugging
    });
  } catch (err) {
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
