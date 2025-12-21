import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

function getOptionalStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x): x is string => Boolean(x));
}

/**
 * Accepts either:
 * - raw storage path: "passports/abc.png"
 * - public URL: "https://.../storage/v1/object/public/applications/passports/abc.png"
 * Returns normalized storage path (without leading "/"), or null.
 */
function normalizeStoragePath(input: unknown, bucket: string): string | null {
  const s = getString(input).trim();
  if (!s) return null;

  // URL case
  try {
    const u = new URL(s);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx !== -1) {
      const extracted = u.pathname.slice(idx + marker.length);
      const path = decodeURIComponent(extracted).replace(/^\/+/, "");
      return path ? path : null;
    }
  } catch {
    // not a URL -> treat as path
  }

  // plain path
  const path = s.replace(/^\/+/, "");
  return path ? path : null;
}

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json();
    if (!isObject(raw)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    // Pull values safely (NO any)
    const email = getString(raw.email).trim().toLowerCase();
    const firstName = getString(raw.firstName).trim();
    const lastName = getString(raw.lastName).trim();
    const programId = getString(raw.programId).trim();
    const nin = getString(raw.nin).trim();

    if (!email || !firstName || !lastName || !programId || !nin) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Passport: accept either passportPath or passportImageId (and allow URL or path)
    const passportPath =
      normalizeStoragePath(raw.passportPath, BUCKET) ??
      normalizeStoragePath(raw.passportImageId, BUCKET);

    if (!passportPath) {
      return NextResponse.json({ error: "Passport is required." }, { status: 400 });
    }

    // Supporting docs: accept either supportingPaths or supportingDocuments
    const supportingPathsRaw =
      getOptionalStringArray(raw.supportingPaths).length > 0
        ? getOptionalStringArray(raw.supportingPaths)
        : getOptionalStringArray(raw.supportingDocuments);

    const supportingPaths = supportingPathsRaw
      .map((v) => normalizeStoragePath(v, BUCKET))
      .filter((x): x is string => Boolean(x));

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

    const supabase = await createClient();

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

    const departmentId = programRow.department_id as string;

    // 3) Insert application (passport_file stored as {bucket,path})
    const applicationPayload = {
      application_no: crypto.randomUUID(),

      session_id: activeSession.id,
      program_id: programId,
      department_id: departmentId,

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

      // store as timestamptz if provided (your form is usually YYYY-MM-DD)
      attestation_date: getString(raw.attestationDate)
        ? new Date(getString(raw.attestationDate)).toISOString()
        : null,

      passport_file: { bucket: BUCKET, path: passportPath },
      signature_file: null,

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

    // 4) Insert supporting docs into application_documents
    if (supportingPaths.length > 0) {
      const docsPayload = supportingPaths.map((p) => ({
        application_id: app.id,
        file: { bucket: BUCKET, path: p },
      }));

      const { error: docsErr } = await supabase
        .from("application_documents")
        .insert(docsPayload);

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
