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
  return v.map(getFileRef).filter((x): x is FileRef => Boolean(x));
}

export async function POST(req: Request) {
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

    // Required uploads (Option B)
    const passportFile = getFileRef(raw.passportFile);
    const signatureFile = getFileRef(raw.signatureFile);
    const supportingFiles = getFileRefArray(raw.supportingFiles);

    if (!passportFile || passportFile.bucket !== BUCKET) {
      return NextResponse.json({ error: "Passport is required." }, { status: 400 });
    }

    if (!signatureFile || signatureFile.bucket !== BUCKET) {
      return NextResponse.json({ error: "Signature is required." }, { status: 400 });
    }

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

    // ✅ Use service role client (bypasses RLS)
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

    // 2) derive department_id from program (applications.department_id is NOT NULL)
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

    // 4) Insert supporting docs into application_documents (if any)
    if (supportingFiles.length > 0) {
      const docsPayload = supportingFiles.map((f) => ({
        application_id: app.id,
        file: f,
      }));

      const { error: docsErr } = await supabase.from("application_documents").insert(docsPayload);

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
    }

    return NextResponse.json({ success: true, application: app });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
