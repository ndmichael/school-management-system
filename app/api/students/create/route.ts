import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmissionsAccess } from "@/lib/guards/requireAdmissionsAccess";
import {
  normalizeNigerianPhone,
  normalizeNin,
} from "@/lib/validation/nigeria";

export const runtime = "nodejs";

type FileRef = {
  bucket: string;
  path: string;
};

type InitialPaymentInput = {
  amount_submitted: number;
  transaction_reference?: string | null;
  remarks?: string | null;
  receipt_file?: FileRef | null;
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

  initial_payment?: InitialPaymentInput | null;
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

function isFileRef(v: unknown): v is FileRef {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as FileRef).bucket === "string" &&
    typeof (v as FileRef).path === "string" &&
    (v as FileRef).bucket.trim().length > 0 &&
    (v as FileRef).path.trim().length > 0
  );
}

function parsePositiveAmount(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function getBaseUrl(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";

  if (!host) return "http://localhost:3000";

  const isLocal = host.includes("localhost") || host.startsWith("127.0.0.1");
  const scheme = isLocal ? "http" : proto;

  return `${scheme}://${host}`;
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

function serializeError(err: unknown) {
  if (!err) return null;
  if (typeof err === "string") return { message: err };

  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      message: typeof e.message === "string" ? e.message : null,
      code: typeof e.code === "string" ? e.code : null,
      status: typeof e.status === "number" ? e.status : null,
      details: typeof e.details === "string" ? e.details : null,
      hint: typeof e.hint === "string" ? e.hint : null,
      name: typeof e.name === "string" ? e.name : null,
      raw: e,
    };
  }

  return { message: String(err) };
}

function fail(step: string, error: unknown, status = 400) {
  const payload = {
    error: `Failed at step: ${step}`,
    step,
    debug: serializeError(error),
  };

  console.error("[CREATE_STUDENT_ERROR]", JSON.stringify(payload, null, 2));
  return NextResponse.json(payload, { status });
}

async function removeUploadedFiles(files: FileRef[]) {
  const grouped = new Map<string, string[]>();

  for (const file of files) {
    if (!file?.bucket || !file?.path) continue;
    const paths = grouped.get(file.bucket) ?? [];
    paths.push(file.path);
    grouped.set(file.bucket, paths);
  }

  for (const [bucket, paths] of grouped.entries()) {
    try {
      await supabaseAdmin.storage.from(bucket).remove(paths);
    } catch (err) {
      console.error("[CREATE_STUDENT_ROLLBACK_STORAGE_ERROR]", { bucket, paths, err });
    }
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmissionsAccess();
  if ("error" in guard) return guard.error;

  let createdAuthUserId: string | null = null;
  let createdProfileId: string | null = null;
  let createdStudentId: string | null = null;
  let createdRegistrationId: string | null = null;
  let createdFeeAccountId: string | null = null;

  const uploadedFiles: FileRef[] = [];

  try {
    const raw = (await req.json()) as Body;

    const first_name = cleanText(raw.first_name) ?? "";
    const last_name = cleanText(raw.last_name) ?? "";
    const email = cleanEmail(raw.email);

    const program_id = cleanText(raw.program_id) ?? "";
    const session_id = cleanText(raw.session_id) ?? "";

    let normalizedPhone: string | null = null;
    let normalizedGuardianPhone: string | null = null;
    let normalizedNin: string | null = null;

    try {
      const rawPhone = cleanText(raw.phone);
      const rawGuardianPhone = cleanText(raw.guardian_phone);
      const rawNin = cleanText(raw.nin);

      if (rawPhone) {
        normalizedPhone = normalizeNigerianPhone(rawPhone);
      }

      if (rawGuardianPhone) {
        normalizedGuardianPhone = normalizeNigerianPhone(rawGuardianPhone);
      }

      if (rawNin) {
        normalizedNin = normalizeNin(rawNin);
      }
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Invalid phone or NIN format",
        },
        { status: 400 }
      );
    }

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

    if (
      !raw.passport_file ||
      !isFileRef(raw.passport_file) ||
      raw.passport_file.bucket !== "avatars"
    ) {
      return NextResponse.json(
        { error: "Passport is required and must be uploaded to avatars bucket" },
        { status: 400 }
      );
    }

    if (!raw.signature_file || !isFileRef(raw.signature_file)) {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    uploadedFiles.push(raw.passport_file, raw.signature_file);

    const docTypes = (raw.documents ?? []).map((d) => d.doc_type);

    if (!docTypes.includes("academic_result") || !docTypes.includes("birth_or_age")) {
      return NextResponse.json(
        { error: "Academic result and birth certificate are required" },
        { status: 400 }
      );
    }

    if (Array.isArray(raw.documents)) {
      for (const d of raw.documents) {
        if (isFileRef(d.file)) uploadedFiles.push(d.file);
      }
    }

    const initialPayment = raw.initial_payment ?? null;
    const initialPaymentAmount = initialPayment
      ? parsePositiveAmount(initialPayment.amount_submitted)
      : null;

    if (initialPayment) {
      if (!initialPaymentAmount) {
        return NextResponse.json(
          { error: "initial_payment.amount_submitted must be greater than 0" },
          { status: 400 }
        );
      }

      if (!initialPayment.receipt_file || !isFileRef(initialPayment.receipt_file)) {
        return NextResponse.json(
          { error: "initial_payment.receipt_file is required" },
          { status: 400 }
        );
      }

      uploadedFiles.push(initialPayment.receipt_file);
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingErr) return fail("check_existing_profile", existingErr, 400);

    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const { data: authUsersData, error: listUsersErr } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listUsersErr) {
      return fail("list_auth_users", listUsersErr, 500);
    }

    const authExists = authUsersData.users.some(
      (u) => (u.email ?? "").toLowerCase() === email
    );

    if (authExists) {
      return NextResponse.json(
        {
          error:
            "User already exists in auth (delete them or use a different email).",
        },
        { status: 409 }
      );
    }

    const { data: program, error: programErr } = await supabaseAdmin
      .from("programs")
      .select("code, department_id")
      .eq("id", program_id)
      .single();

    if (programErr || !program) {
      return fail("load_program", programErr ?? { message: "Program not found" }, 400);
    }

    const { data: feePlan, error: feePlanErr } = await supabaseAdmin
      .from("program_fee_plans")
      .select("id, annual_fee")
      .eq("program_id", program_id)
      .eq("session_id", session_id)
      .maybeSingle<{ id: string; annual_fee: number }>();

    if (feePlanErr) return fail("load_fee_plan", feePlanErr, 400);

    if (!feePlan) {
      return NextResponse.json(
        { error: "No fee plan found for the selected program and session" },
        { status: 400 }
      );
    }

    const annualFee = Number(feePlan.annual_fee ?? 0);

    if (!Number.isFinite(annualFee) || annualFee < 0) {
      return NextResponse.json(
        { error: "Invalid annual fee configured for this program/session" },
        { status: 400 }
      );
    }

    const { data: matricNo, error: matricErr } = await supabaseAdmin.rpc(
      "generate_student_matric_no",
      { p_prefix: program.code }
    );

    if (matricErr) return fail("generate_matric_no", matricErr, 400);

    if (!matricNo) {
      return NextResponse.json(
        { error: "Failed to generate matric number" },
        { status: 400 }
      );
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? getBaseUrl(req)).replace(/\/$/, "");
    const redirectTo = `${baseUrl}/api/auth/confirm`;

    console.log("[CREATE_STUDENT] inviting auth user", { email, redirectTo });

    const { data: inviteRes, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          main_role: "student",
          onboarding_status: "pending",
        },
      });

    if (inviteErr) {
      const msg = inviteErr.message ?? "Invite failed";
      const isDup = isDuplicateAuthMessage(msg);

      return fail(
        "invite_auth_user",
        {
          ...serializeError(inviteErr),
          duplicate_detected: isDup,
          email,
          redirectTo,
        },
        isDup ? 409 : 400
      );
    }

    const userId = inviteRes?.user?.id ?? null;

    if (!userId) {
      return fail("invite_auth_user_no_id", { message: "Auth invite returned no user id" }, 400);
    }

    createdAuthUserId = userId;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        first_name,
        middle_name: cleanText(raw.middle_name),
        last_name,
        email,
        phone: normalizedPhone,
        gender: cleanText(raw.gender),
        date_of_birth: cleanText(raw.date_of_birth),
        state_of_origin: cleanText(raw.state_of_origin),
        lga_of_origin: cleanText(raw.lga_of_origin),
        nin: normalizedNin,
        religion: cleanText(raw.religion),
        address: cleanText(raw.address),
        main_role: "student",
        onboarding_status: "pending",
        avatar_file: {
          bucket: "avatars",
          path: raw.passport_file.path,
        },
      })
      .select("id")
      .single();

    if (profileErr || !profile) {
      throw { step: "create_profile", error: profileErr ?? { message: "Profile creation failed" } };
    }

    createdProfileId = profile.id;

    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .insert({
        profile_id: profile.id,
        matric_no: matricNo,
        program_id,
        department_id: program.department_id,
        admission_session_id: session_id,
        guardian_first_name: cleanText(raw.guardian_first_name),
        guardian_last_name: cleanText(raw.guardian_last_name),
        guardian_phone: normalizedGuardianPhone,
        guardian_status: cleanText(raw.guardian_status),
        status: "active",
        enrollment_date: new Date().toISOString().slice(0, 10),
      })
      .select("id, matric_no")
      .single();

    if (studentErr || !student) {
      throw { step: "create_student", error: studentErr ?? { message: "Student creation failed" } };
    }

    createdStudentId = student.id;

    const { data: registration, error: regErr } = await supabaseAdmin
      .from("student_registrations")
      .insert({
        student_id: student.id,
        session_id,
        level: cleanText(raw.level),
        status: "registered",
      })
      .select("id")
      .single<{ id: string }>();

    if (regErr || !registration) {
      throw {
        step: "create_student_registration",
        error: regErr ?? { message: "Student registration creation failed" },
      };
    }

    createdRegistrationId = registration.id;

    const { data: feeAccount, error: feeAccountErr } = await supabaseAdmin
      .from("student_fee_accounts")
      .insert({
        student_registration_id: registration.id,
        program_id,
        annual_fee: annualFee,
        total_paid_approved: 0,
        balance_due: annualFee,
        payment_status: "unpaid",
      })
      .select("id")
      .single<{ id: string }>();

    if (feeAccountErr || !feeAccount) {
      throw {
        step: "create_student_fee_account",
        error: feeAccountErr ?? { message: "Student fee account creation failed" },
      };
    }

    createdFeeAccountId = feeAccount.id;

    if (initialPayment && initialPaymentAmount && initialPayment.receipt_file) {
      const { error: paymentErr } = await supabaseAdmin
        .from("payment_receipts")
        .insert({
          student_fee_account_id: feeAccount.id,
          amount_submitted: initialPaymentAmount,
          approved_amount: null,
          transaction_reference: cleanText(initialPayment.transaction_reference),
          remarks: cleanText(initialPayment.remarks),
          status: "pending",
          receipt_file: initialPayment.receipt_file,
          uploaded_by: null,
          verified_by: null,
          rejected_by: null,
          verified_at: null,
          rejected_at: null,
        });

      if (paymentErr) {
        throw { step: "create_initial_payment_receipt", error: paymentErr };
      }
    }

    const docs: Array<{
      student_id: string;
      doc_type: string;
      file: FileRef;
      original_name?: string | null;
      mime_type?: string | null;
    }> = [];

    docs.push({
      student_id: student.id,
      doc_type: "passport",
      file: raw.passport_file,
    });

    docs.push({
      student_id: student.id,
      doc_type: "signature",
      file: raw.signature_file,
    });

    if (Array.isArray(raw.documents)) {
      for (const d of raw.documents) {
        docs.push({
          student_id: student.id,
          doc_type: d.doc_type,
          file: d.file,
          original_name: d.original_name ?? null,
          mime_type: d.mime_type ?? null,
        });
      }
    }

    if (docs.length) {
      const { error: docErr } = await supabaseAdmin
        .from("student_documents")
        .insert(docs);

      if (docErr) {
        throw { step: "insert_student_documents", error: docErr };
      }
    }

    return NextResponse.json({
      success: true,
      studentId: student.id,
      matricNo: student.matric_no,
      annualFee,
      hasInitialPayment: !!initialPayment,
      email,
    });
  } catch (err) {
    console.error("[CREATE_STUDENT_FATAL]", err);

    if (createdFeeAccountId) {
      await supabaseAdmin.from("student_fee_accounts").delete().eq("id", createdFeeAccountId);
    }

    if (createdRegistrationId) {
      await supabaseAdmin.from("student_registrations").delete().eq("id", createdRegistrationId);
    }

    if (createdStudentId) {
      await supabaseAdmin.from("student_documents").delete().eq("student_id", createdStudentId);
      await supabaseAdmin.from("students").delete().eq("id", createdStudentId);
    }

    if (createdProfileId) {
      await supabaseAdmin.from("profiles").delete().eq("id", createdProfileId);
    }

    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    await removeUploadedFiles(uploadedFiles);

    if (
      err &&
      typeof err === "object" &&
      "step" in err &&
      "error" in err
    ) {
      const typedErr = err as { step: string; error: unknown };
      return fail(typedErr.step, typedErr.error, 400);
    }

    return NextResponse.json(
      {
        error: "Server error",
        step: "unhandled_catch",
        debug: serializeError(err),
      },
      { status: 500 }
    );
  }
}