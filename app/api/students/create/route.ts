import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmissionsAccess } from "@/lib/guards/requireAdmissionsAccess";

export const runtime = "nodejs";

type AdmissionType = "fresh" | "direct_entry";

type Body = {
  // Personal (required)
  first_name: string;
  last_name: string;
  email: string;

  // Personal (optional)
  middle_name?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;

  state_of_origin?: string | null;
  lga_of_origin?: string | null;
  nin?: string | null;
  religion?: string | null;
  address?: string | null;

  // Academic (required)
  program_id: string;
  session_id: string; // admission session => student_registrations.session_id

  // Academic (optional)
  level?: string | null; // => student_registrations.level

  // NEW
  admission_type?: AdmissionType | null; // fresh | direct_entry
  previous_school?: string | null;
  previous_qualification?: string | null;
  special_needs?: string | null;

  // Guardian (optional)
  guardian_first_name?: string | null;
  guardian_last_name?: string | null;
  guardian_phone?: string | null;
  guardian_status?: string | null;
};

type ProgramRow = { code: string; department_id: string | null };
type ProfileIdRow = { id: string };

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function cleanText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function cleanEmail(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().toLowerCase();
}

function parseAdmissionType(v: unknown): AdmissionType {
  return v === "direct_entry" ? "direct_entry" : "fresh";
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

function getBaseUrl(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";

  const isLocal = host.includes("localhost") || host.startsWith("127.0.0.1");
  const scheme = isLocal ? "http" : proto;

  return `${scheme}://${host}`;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmissionsAccess();
  if ("error" in guard) return guard.error;

  let createdAuthUserId: string | null = null;

  try {
    const raw = (await req.json().catch(() => null)) as Partial<Body> | null;
    if (!raw) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const first_name = cleanText(raw.first_name) ?? "";
    const last_name = cleanText(raw.last_name) ?? "";
    const email = cleanEmail(raw.email);

    const program_id = cleanText(raw.program_id) ?? "";
    const session_id = cleanText(raw.session_id) ?? "";

    if (!first_name || !last_name || !email) {
      return NextResponse.json({ error: "first_name, last_name, email are required" }, { status: 400 });
    }
    if (!isUuid(program_id) || !isUuid(session_id)) {
      return NextResponse.json({ error: "program_id and session_id must be valid UUIDs" }, { status: 400 });
    }

    // admission_type + conditional fields
    const admission_type = parseAdmissionType(raw.admission_type);
    const previous_school = cleanText(raw.previous_school);
    const previous_qualification = cleanText(raw.previous_qualification);

    if (admission_type === "direct_entry") {
      if (!previous_school || !previous_qualification) {
        return NextResponse.json(
          { error: "previous_school and previous_qualification are required for direct_entry" },
          { status: 400 }
        );
      }
    }

    // Prevent duplicates by email (profile exists)
    const { data: existingProfile, error: profCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle<ProfileIdRow>();

    if (profCheckErr) return NextResponse.json({ error: profCheckErr.message }, { status: 400 });
    if (existingProfile?.id) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    // Fetch program code + department_id (derive department from program)
    const { data: program, error: programErr } = await supabaseAdmin
      .from("programs")
      .select("code, department_id")
      .eq("id", program_id)
      .single<ProgramRow>();

    if (programErr || !program?.code) {
      return NextResponse.json({ error: programErr?.message ?? "Program not found." }, { status: 400 });
    }

    const derivedDepartmentId = program.department_id;
    if (!derivedDepartmentId || !isUuid(derivedDepartmentId)) {
      return NextResponse.json(
        { error: "Selected program has no valid department linked. Fix programs.department_id." },
        { status: 400 }
      );
    }

    // Matric number
    const { data: matricNo, error: matricErr } = await supabaseAdmin.rpc("generate_student_matric_no", {
      p_prefix: program.code,
    });

    if (matricErr || !matricNo) {
      return NextResponse.json({ error: matricErr?.message ?? "Failed to generate matric number." }, { status: 400 });
    }

    // Invite auth user
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? getBaseUrl(req)).replace(/\/$/, "");
    const redirectTo = `${baseUrl}/api/auth/confirm`;

    const { data: inviteRes, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { onboarding_status: "pending", main_role: "student" },
    });

    if (inviteErr) {
      const msg = inviteErr.message ?? "Invite failed";
      const isDup = isDuplicateAuthMessage(msg);
      return NextResponse.json({ error: isDup ? "User already exists" : msg }, { status: isDup ? 409 : 400 });
    }

    const userId = inviteRes?.user?.id ?? null;
    if (!userId) {
      return NextResponse.json({ error: "Invite succeeded but no user id returned." }, { status: 400 });
    }
    createdAuthUserId = userId;

    // Create profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        first_name,
        middle_name: cleanText(raw.middle_name) ?? null,
        last_name,
        email,
        phone: cleanText(raw.phone) ?? null,
        gender: cleanText(raw.gender) ?? null,
        date_of_birth: cleanText(raw.date_of_birth) ?? null,

        state_of_origin: cleanText(raw.state_of_origin) ?? null,
        lga_of_origin: cleanText(raw.lga_of_origin) ?? null,
        nin: cleanText(raw.nin) ?? null,
        religion: cleanText(raw.religion) ?? null,
        address: cleanText(raw.address) ?? null,

        main_role: "student",
        onboarding_status: "pending",
        avatar_file: null,
      })
      .select("id")
      .single<ProfileIdRow>();

    if (profileErr || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      createdAuthUserId = null;
      return NextResponse.json({ error: profileErr?.message ?? "Failed to create profile." }, { status: 400 });
    }

    // Create student (department derived from program)
    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .insert({
        profile_id: profile.id,
        matric_no: String(matricNo),

        program_id,
        department_id: derivedDepartmentId,

        admission_type,
        previous_school: admission_type === "direct_entry" ? previous_school : null,
        previous_qualification: admission_type === "direct_entry" ? previous_qualification : null,
        special_needs: cleanText(raw.special_needs) ?? null,

        status: "active",
        enrollment_date: new Date().toISOString().slice(0, 10),

        guardian_first_name: cleanText(raw.guardian_first_name) ?? null,
        guardian_last_name: cleanText(raw.guardian_last_name) ?? null,
        guardian_phone: cleanText(raw.guardian_phone) ?? null,
        guardian_status: cleanText(raw.guardian_status) ?? null,
      })
      .select("id, matric_no")
      .single<{ id: string; matric_no: string }>();

    if (studentErr || !student) {
      await supabaseAdmin.from("profiles").delete().eq("id", profile.id);
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      createdAuthUserId = null;
      return NextResponse.json({ error: studentErr?.message ?? "Failed to create student." }, { status: 400 });
    }

    // Create registration for admission session (level optional)
    const level = cleanText(raw.level);

    const { error: regErr } = await supabaseAdmin.from("student_registrations").upsert(
      [
        {
          student_id: student.id,
          session_id,
          level: level ?? null,
          status: "registered",
        },
      ],
      { onConflict: "student_id,session_id" }
    );

    if (regErr) {
      return NextResponse.json({
        success: true,
        studentId: student.id,
        matricNo: student.matric_no,
        inviteQueued: true,
        redirectTo,
        warning: `Student created but registration failed: ${regErr.message}`,
      });
    }

    return NextResponse.json({
      success: true,
      studentId: student.id,
      matricNo: student.matric_no,
      studentEmail: email,
      inviteQueued: true,
      redirectTo,
    });
  } catch (err) {
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
