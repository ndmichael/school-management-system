import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "applications";

type JsonObject = Record<string, unknown>;

function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function getOptionalString(v: unknown): string | null {
  const s = getString(v).trim();
  return s ? s : null;
}

type FileRef = { bucket: string; path: string };

function isFileRef(v: unknown): v is FileRef {
  return (
    isObject(v) &&
    typeof v.bucket === "string" &&
    typeof v.path === "string" &&
    v.bucket.length > 0 &&
    v.path.length > 0
  );
}

function getFileRef(v: unknown): FileRef | null {
  return isFileRef(v) ? v : null;
}

function getFileRefArray(v: unknown): FileRef[] {
  if (!Array.isArray(v)) return [];
  const out: FileRef[] = [];
  for (const item of v) {
    const ref = getFileRef(item);
    if (ref) out.push(ref);
  }
  return out;
}

type SupportingDocType =
  | "academic_result"
  | "birth_or_age"
  | "sponsorship_letter"
  | "supporting_optional";

type SupportingDocInput = {
  doc_type: SupportingDocType;
  file: FileRef;
  original_name?: string | null;
  mime_type?: string | null;
};

function isSupportingDocType(v: unknown): v is SupportingDocType {
  return (
    v === "academic_result" ||
    v === "birth_or_age" ||
    v === "sponsorship_letter" ||
    v === "supporting_optional"
  );
}

function parseSupportingDocs(v: unknown): SupportingDocInput[] {
  if (!Array.isArray(v)) return [];
  const out: SupportingDocInput[] = [];

  for (const item of v) {
    if (!isObject(item)) continue;

    const docType = item.doc_type;
    const file = item.file;

    if (!isSupportingDocType(docType)) continue;
    const ref = getFileRef(file);
    if (!ref) continue;

    out.push({
      doc_type: docType,
      file: ref,
      original_name: typeof item.original_name === "string" ? item.original_name : null,
      mime_type: typeof item.mime_type === "string" ? item.mime_type : null,
    });
  }

  return out;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json();
    if (!isObject(raw)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    // Required fields
    const email = getString(raw.email).trim().toLowerCase();
    const firstName = getString(raw.firstName).trim();
    const lastName = getString(raw.lastName).trim();
    const programId = getString(raw.programId).trim();
    const nin = getString(raw.nin).trim();

    if (!email || !firstName || !lastName || !programId || !nin) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Required uploads (passport + signature)
    const passportFile = getFileRef(raw.passportFile);
    const signatureFile = getFileRef(raw.signatureFile);

    if (!passportFile || passportFile.bucket !== BUCKET) {
      return NextResponse.json({ error: "Passport is required." }, { status: 400 });
    }

    if (!signatureFile || signatureFile.bucket !== BUCKET) {
      return NextResponse.json({ error: "Signature is required." }, { status: 400 });
    }

    // NEW: required supporting docs come as dedicated fields on the payload
    const academicResultFile = getFileRef(raw.academicResultFile);
    const birthCertificateFile = getFileRef(raw.birthCertificateFile);
    const sponsorshipLetterFile = getFileRef(raw.sponsorshipLetterFile);

    if (!academicResultFile || academicResultFile.bucket !== BUCKET) {
      return NextResponse.json(
        { error: "Academic result document is required." },
        { status: 400 }
      );
    }

    if (!birthCertificateFile || birthCertificateFile.bucket !== BUCKET) {
      return NextResponse.json(
        { error: "Birth certificate / age declaration is required." },
        { status: 400 }
      );
    }

    // Optional typed supporting docs array (if you still send it)
    const supportingDocs = parseSupportingDocs(raw.supportingDocs);

    // Legacy fallback: supportingFiles[] (untyped extra docs)
    const legacySupportingFiles = getFileRefArray(raw.supportingFiles);

    // Direct entry checks
    const admissionType = getString(raw.admissionType).trim();
    if (admissionType === "direct_entry") {
      const prevSchool = getString(raw.previousSchool).trim();
      const prevQual = getString(raw.previousQualification).trim();
      if (!prevSchool || !prevQual) {
        return NextResponse.json(
          { error: "Previous school and qualification are required for Direct Entry." },
          { status: 400 }
        );
      }
    }

    const supabase = supabaseAdmin;

    // 1) active session
    const { data: activeSession, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !activeSession) {
      return NextResponse.json({ error: "No active session configured." }, { status: 400 });
    }

    // 2) derive department_id from program
    const { data: programRow, error: programErr } = await supabase
      .from("programs")
      .select("department_id")
      .eq("id", programId)
      .single();

    if (programErr || !programRow?.department_id) {
      return NextResponse.json(
        { error: "Selected program is missing department mapping." },
        { status: 400 }
      );
    }

    // 3) Insert application
    const applicationPayload = {
      application_no: crypto.randomUUID(),
      session_id: activeSession.id,
      program_id: programId,
      department_id: programRow.department_id,

      first_name: firstName,
      middle_name: getOptionalString(raw.middleName),
      last_name: lastName,

      gender: getString(raw.gender),
      date_of_birth: getString(raw.dateOfBirth),

      email,
      phone: getOptionalString(raw.phone),
      nin,
      special_needs: getOptionalString(raw.specialNeeds),

      state_of_origin: getString(raw.stateOfOrigin),
      lga_of_origin: getString(raw.lgaOfOrigin),
      religion: getString(raw.religion),
      address: getString(raw.address),

      class_applied_for: getString(raw.classAppliedFor),
      application_type: getString(raw.admissionType),
      previous_school: getOptionalString(raw.previousSchool),
      previous_qualification: getOptionalString(raw.previousQualification),

      guardian_first_name: getString(raw.guardianFirstName),
      guardian_middle_name: getOptionalString(raw.guardianMiddleName),
      guardian_last_name: getString(raw.guardianLastName),
      guardian_gender: getString(raw.guardianGender),
      guardian_status: getString(raw.guardianStatus),
      guardian_phone: getString(raw.guardianPhone),
      guardian_email: getOptionalString(raw.guardianEmail),

      attestation_date: getString(raw.attestationDate)
        ? new Date(getString(raw.attestationDate)).toISOString()
        : null,

      passport_file: passportFile,
      signature_file: signatureFile,

      status: "pending",
    };

    const { data: app, error: appErr } = await supabase
      .from("applications")
      .insert(applicationPayload)
      .select("id, application_no, status, created_at")
      .single();

    if (appErr || !app) {
      return NextResponse.json(
        { error: appErr?.message ?? "Failed to create application." },
        { status: 400 }
      );
    }

    // 4) Insert supporting documents into application_documents (SOURCE OF TRUTH)
    const docsToInsert: {
      application_id: string;
      doc_type: string;
      file: FileRef;
      original_name: string | null;
      mime_type: string | null;
    }[] = [
      {
        application_id: app.id,
        doc_type: "academic_result",
        file: academicResultFile,
        original_name: null,
        mime_type: null,
      },
      {
        application_id: app.id,
        doc_type: "birth_or_age",
        file: birthCertificateFile,
        original_name: null,
        mime_type: null,
      },
    ];

    if (sponsorshipLetterFile && sponsorshipLetterFile.bucket === BUCKET) {
      docsToInsert.push({
        application_id: app.id,
        doc_type: "sponsorship_letter",
        file: sponsorshipLetterFile,
        original_name: null,
        mime_type: null,
      });
    }

    // Optional: also accept supportingDocs array (if sent)
    for (const d of supportingDocs) {
      docsToInsert.push({
        application_id: app.id,
        doc_type: d.doc_type,
        file: d.file,
        original_name: d.original_name ?? null,
        mime_type: d.mime_type ?? null,
      });
    }

    // Optional: legacy extra docs
    for (const f of legacySupportingFiles) {
      docsToInsert.push({
        application_id: app.id,
        doc_type: "supporting_optional",
        file: f,
        original_name: null,
        mime_type: null,
      });
    }

    const { error: docsErr } = await supabase.from("application_documents").insert(docsToInsert);
    if (docsErr) {
      return NextResponse.json(
        {
          success: true,
          application: app,
          warning: `Application saved but documents failed: ${docsErr.message}`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, application: app });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
