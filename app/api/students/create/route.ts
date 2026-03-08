import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmissionsAccess } from "@/lib/guards/requireAdmissionsAccess";

export const runtime = "nodejs";

type FileRef = {
  bucket: string;
  path: string;
};

type Body = {
  first_name: string;
  last_name: string;
  email: string;

  middle_name?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;

  state_of_origin?: string | null;
  lga_of_origin?: string | null;
  nin?: string | null;
  religion?: string | null;
  address?: string | null;

  program_id: string;
  session_id: string;
  level?: string | null;

  guardian_first_name?: string | null;
  guardian_last_name?: string | null;
  guardian_phone?: string | null;
  guardian_status?: string | null;

  passport_file?: FileRef | null;
  signature_file?: FileRef | null;

  documents?: {
    doc_type: string;
    file: FileRef;
    original_name?: string | null;
    mime_type?: string | null;
  }[];
};

function isUuid(v: string) {
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

export async function POST(req: NextRequest) {

  const guard = await requireAdmissionsAccess();
  if ("error" in guard) return guard.error;

  let createdAuthUserId: string | null = null;

  try {

    const raw = (await req.json()) as Body;

    const first_name = cleanText(raw.first_name) ?? "";
    const last_name = cleanText(raw.last_name) ?? "";
    const email = cleanEmail(raw.email);

    const program_id = cleanText(raw.program_id) ?? "";
    const session_id = cleanText(raw.session_id) ?? "";

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: "first_name, last_name and email are required" },
        { status: 400 }
      );
    }

    if (!isUuid(program_id) || !isUuid(session_id)) {
      return NextResponse.json(
        { error: "Invalid program_id or session_id" },
        { status: 400 }
      );
    }

    const docTypes = (raw.documents ?? []).map((d) => d.doc_type);

    if (!raw.passport_file || !raw.signature_file) {
      return NextResponse.json(
        { error: "Passport and signature are required" },
        { status: 400 }
      );
    }

    if (!docTypes.includes("academic_result") || !docTypes.includes("birth_or_age")) {
      return NextResponse.json(
        { error: "Academic result and birth certificate are required" },
        { status: 400 }
      );
    }

    // check duplicate email
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // get program
    const { data: program, error: programErr } = await supabaseAdmin
      .from("programs")
      .select("code, department_id")
      .eq("id", program_id)
      .single();

    if (programErr || !program) {
      return NextResponse.json(
        { error: programErr?.message ?? "Program not found" },
        { status: 400 }
      );
    }

    // generate matric number
    const { data: matricNo } = await supabaseAdmin.rpc(
      "generate_student_matric_no",
      { p_prefix: program.code }
    );

    if (!matricNo) {
      return NextResponse.json(
        { error: "Failed to generate matric number" },
        { status: 400 }
      );
    }

    // create auth user
    // const { data: authUser, error: authErr } =
    //   await supabaseAdmin.auth.admin.createUser({
    //     email,
    //     email_confirm: false
    //   });

    // if (authErr) {
    //   return NextResponse.json(
    //     { error: authErr.message },
    //     { status: 400 }
    //   );
    // }

    // const userId = authUser.user.id;
    // createdAuthUserId = userId;

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      `${req.headers.get("x-forwarded-proto") ?? "http"}://${req.headers.get("host")}`;

    const redirectTo = `${baseUrl}/auth/set-password`;

    const { data: inviteRes, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          main_role: "student",
          onboarding_status: "pending"
        }
      });

    if (inviteErr) {
      return NextResponse.json(
        { error: inviteErr.message },
        { status: 400 }
      );
    }

    const userId = inviteRes.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User creation failed" },
        { status: 400 }
      );
    }

    createdAuthUserId = userId;

    // create profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        first_name,
        middle_name: cleanText(raw.middle_name),
        last_name,
        email,
        phone: cleanText(raw.phone),
        gender: cleanText(raw.gender),
        date_of_birth: cleanText(raw.date_of_birth),

        state_of_origin: cleanText(raw.state_of_origin),
        lga_of_origin: cleanText(raw.lga_of_origin),
        nin: cleanText(raw.nin),
        religion: cleanText(raw.religion),
        address: cleanText(raw.address),

        main_role: "student",
        onboarding_status: "pending"
      })
      .select("id")
      .single();

    if (!profile) throw new Error("Profile creation failed");

    // create student
    const { data: student } = await supabaseAdmin
      .from("students")
      .insert({
        profile_id: profile.id,
        matric_no: matricNo,
        program_id,
        department_id: program.department_id,

        guardian_first_name: cleanText(raw.guardian_first_name),
        guardian_last_name: cleanText(raw.guardian_last_name),
        guardian_phone: cleanText(raw.guardian_phone),
        guardian_status: cleanText(raw.guardian_status),

        status: "active",
        enrollment_date: new Date().toISOString().slice(0, 10)
      })
      .select("id, matric_no")
      .single();

    if (!student) throw new Error("Student creation failed");

    // registration
    await supabaseAdmin.from("student_registrations").insert({
      student_id: student.id,
      session_id,
      level: cleanText(raw.level),
      status: "registered"
    });

    // documents
    const docs = [];

    if (raw.passport_file) {
      docs.push({
        student_id: student.id,
        doc_type: "passport",
        file: raw.passport_file
      });
    }

    if (raw.signature_file) {
      docs.push({
        student_id: student.id,
        doc_type: "signature",
        file: raw.signature_file
      });
    }

    if (Array.isArray(raw.documents)) {
      for (const d of raw.documents) {
        docs.push({
          student_id: student.id,
          doc_type: d.doc_type,
          file: d.file,
          original_name: d.original_name ?? null,
          mime_type: d.mime_type ?? null
        });
      }
    }

    if (docs.length) {
      const { error: docErr } = await supabaseAdmin
        .from("student_documents")
        .insert(docs);

      if (docErr) throw docErr;
    }

    return NextResponse.json({
      success: true,
      studentId: student.id,
      matricNo: student.matric_no,
      email
    });

  } catch (err) {

    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}