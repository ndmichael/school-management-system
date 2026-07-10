import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeNigerianPhone } from "@/lib/validation/nigeria";

const PASSPORT_BUCKET = "avatars";
const DOCUMENTS_BUCKET = "applications";

type JsonObject = Record<string, unknown>;

type ExistingApplication = {
  id: string;
  application_no: string;
  status: string | null;
  created_at: string;
};

type FileRef = {
  bucket: string;
  path: string;
};

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

type ApplicationDocumentPayload = {
  doc_type: SupportingDocType;
  file: FileRef;
  original_name: string | null;
  mime_type: string | null;
};

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getOptionalString(value: unknown): string | null {
  const stringValue = getString(value).trim();

  return stringValue || null;
}

function getRequiredIsoDate(
  value: unknown,
  label: string
): string | NextResponse {
  const rawValue = getString(value).trim();

  if (!rawValue) {
    return NextResponse.json(
      {
        error: `${label} is required.`,
      },
      {
        status: 400,
      }
    );
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      {
        error: `${label} is invalid.`,
      },
      {
        status: 400,
      }
    );
  }

  return date.toISOString();
}

function isFileRef(value: unknown): value is FileRef {
  return (
    isObject(value) &&
    typeof value.bucket === "string" &&
    typeof value.path === "string" &&
    value.bucket.length > 0 &&
    value.path.length > 0
  );
}

function getFileRef(value: unknown): FileRef | null {
  return isFileRef(value) ? value : null;
}

function getFileRefArray(value: unknown): FileRef[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const files: FileRef[] = [];

  for (const item of value) {
    const file = getFileRef(item);

    if (file) {
      files.push(file);
    }
  }

  return files;
}

function isSupportingDocType(
  value: unknown
): value is SupportingDocType {
  return (
    value === "academic_result" ||
    value === "birth_or_age" ||
    value === "sponsorship_letter" ||
    value === "supporting_optional"
  );
}

function parseSupportingDocs(
  value: unknown
): SupportingDocInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const documents: SupportingDocInput[] = [];

  for (const item of value) {
    if (!isObject(item)) {
      continue;
    }

    const docType = item.doc_type;
    const file = getFileRef(item.file);

    if (!isSupportingDocType(docType) || !file) {
      continue;
    }

    documents.push({
      doc_type: docType,
      file,
      original_name:
        typeof item.original_name === "string"
          ? item.original_name
          : null,
      mime_type:
        typeof item.mime_type === "string"
          ? item.mime_type
          : null,
    });
  }

  return documents;
}

function validateFileRef(
  file: FileRef | null,
  expectedBucket: string,
  expectedFolder: string,
  label: string
): string | null {
  if (!file) {
    return `${label} is required.`;
  }

  if (file.bucket !== expectedBucket) {
    return `${label} was uploaded to an invalid bucket.`;
  }

  if (!file.path.startsWith(`${expectedFolder}/`)) {
    return `${label} has an invalid file path.`;
  }

  return null;
}

function duplicateApplicationResponse(
  application: ExistingApplication
): NextResponse {
  if (application.status === "rejected") {
    return NextResponse.json(
      {
        error:
          "A rejected application already exists for this programme and academic session.",
        code: "REJECTED_APPLICATION_EXISTS",
        action: "appeal_or_reopen",
        application: {
          id: application.id,
          application_no: application.application_no,
          status: application.status,
          created_at: application.created_at,
        },
      },
      {
        status: 409,
      }
    );
  }

  return NextResponse.json(
    {
      error:
        "You already have an application for this programme and academic session.",
      code: "APPLICATION_ALREADY_EXISTS",
      application: {
        id: application.id,
        application_no: application.application_no,
        status: application.status,
        created_at: application.created_at,
      },
    },
    {
      status: 409,
    }
  );
}

export async function POST(
  req: Request
): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json();

    if (!isObject(raw)) {
      return NextResponse.json(
        {
          error: "Invalid payload.",
        },
        {
          status: 400,
        }
      );
    }

    const email = getString(raw.email)
      .trim()
      .toLowerCase();

    const firstName = getString(raw.firstName).trim();
    const lastName = getString(raw.lastName).trim();
    const programId = getString(raw.programId).trim();
    const nin = getString(raw.nin).trim();

    if (
      !email ||
      !firstName ||
      !lastName ||
      !programId ||
      !nin
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields.",
        },
        {
          status: 400,
        }
      );
    }

    const phoneRaw = getString(raw.phone).trim();

    if (!phoneRaw) {
      return NextResponse.json(
        {
          error: "Phone number is required.",
        },
        {
          status: 400,
        }
      );
    }

    let phone: string;

    try {
      phone = normalizeNigerianPhone(phoneRaw);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid phone number.",
        },
        {
          status: 400,
        }
      );
    }

    const attestationDate = getRequiredIsoDate(
      raw.attestationDate,
      "Attestation date"
    );

    if (attestationDate instanceof NextResponse) {
      return attestationDate;
    }

    const passportFile = getFileRef(raw.passportFile);
    const signatureFile = getFileRef(raw.signatureFile);

    const academicResultFile = getFileRef(
      raw.academicResultFile
    );

    const birthCertificateFile = getFileRef(
      raw.birthCertificateFile
    );

    const sponsorshipLetterFile = getFileRef(
      raw.sponsorshipLetterFile
    );

    const passportError = validateFileRef(
      passportFile,
      PASSPORT_BUCKET,
      "passports",
      "Passport"
    );

    if (passportError) {
      return NextResponse.json(
        {
          error: passportError,
        },
        {
          status: 400,
        }
      );
    }

    const signatureError = validateFileRef(
      signatureFile,
      DOCUMENTS_BUCKET,
      "signatures",
      "Signature"
    );

    if (signatureError) {
      return NextResponse.json(
        {
          error: signatureError,
        },
        {
          status: 400,
        }
      );
    }

    const academicResultError = validateFileRef(
      academicResultFile,
      DOCUMENTS_BUCKET,
      "results",
      "Academic result document"
    );

    if (academicResultError) {
      return NextResponse.json(
        {
          error: academicResultError,
        },
        {
          status: 400,
        }
      );
    }

    const birthCertificateError = validateFileRef(
      birthCertificateFile,
      DOCUMENTS_BUCKET,
      "birth-certificates",
      "Birth certificate / age declaration"
    );

    if (birthCertificateError) {
      return NextResponse.json(
        {
          error: birthCertificateError,
        },
        {
          status: 400,
        }
      );
    }

    if (sponsorshipLetterFile) {
      const sponsorshipError = validateFileRef(
        sponsorshipLetterFile,
        DOCUMENTS_BUCKET,
        "sponsorships",
        "Sponsorship letter"
      );

      if (sponsorshipError) {
        return NextResponse.json(
          {
            error: sponsorshipError,
          },
          {
            status: 400,
          }
        );
      }
    }

    if (
      !passportFile ||
      !signatureFile ||
      !academicResultFile ||
      !birthCertificateFile
    ) {
      return NextResponse.json(
        {
          error: "Required files are missing.",
        },
        {
          status: 400,
        }
      );
    }

    const supportingDocs = parseSupportingDocs(
      raw.supportingDocs
    );

    const legacySupportingFiles = getFileRefArray(
      raw.supportingFiles
    );

    const admissionType = getString(
      raw.admissionType
    ).trim();

    if (admissionType === "direct_entry") {
      const previousSchool = getString(
        raw.previousSchool
      ).trim();

      const previousQualification = getString(
        raw.previousQualification
      ).trim();

      if (
        !previousSchool ||
        !previousQualification
      ) {
        return NextResponse.json(
          {
            error:
              "Previous school and qualification are required for Direct Entry.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const supabase = supabaseAdmin;

    const {
      data: activeSession,
      error: sessionError,
    } = await supabase
      .from("sessions")
      .select("id")
      .eq("is_active", true)
      .order("start_date", {
        ascending: false,
      })
      .limit(1)
      .single();

    if (sessionError || !activeSession) {
      return NextResponse.json(
        {
          error: "No active session configured.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: programRow,
      error: programError,
    } = await supabase
      .from("programs")
      .select("department_id")
      .eq("id", programId)
      .single();

    if (
      programError ||
      !programRow?.department_id
    ) {
      return NextResponse.json(
        {
          error:
            "Selected program is missing department mapping.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Friendly duplicate check.

      The database unique index remains the final protection
      when concurrent requests reach the RPC.
    */
    const {
      data: existingApplication,
      error: existingApplicationError,
    } = await supabase
      .from("applications")
      .select(
        "id, application_no, status, created_at"
      )
      .eq("nin", nin)
      .eq("program_id", programId)
      .eq("session_id", activeSession.id)
      .maybeSingle<ExistingApplication>();

    if (existingApplicationError) {
      console.error(
        "[CHECK_EXISTING_APPLICATION_ERROR]",
        existingApplicationError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the existing application.",
        },
        {
          status: 500,
        }
      );
    }

    if (existingApplication) {
      return duplicateApplicationResponse(
        existingApplication
      );
    }

    /*
      Data sent to the RPC.

      The RPC generates application_no and forces
      the application status to pending.
    */
    const applicationPayload = {
      session_id: activeSession.id,
      program_id: programId,
      department_id: programRow.department_id,

      first_name: firstName,
      middle_name: getOptionalString(raw.middleName),
      last_name: lastName,

      gender: getString(raw.gender),
      date_of_birth: getString(raw.dateOfBirth),

      email,
      phone,
      nin,

      special_needs: getOptionalString(
        raw.specialNeeds
      ),

      state_of_origin: getString(
        raw.stateOfOrigin
      ),

      lga_of_origin: getString(raw.lgaOfOrigin),
      religion: getString(raw.religion),
      address: getString(raw.address),

      class_applied_for: getString(
        raw.classAppliedFor
      ),

      application_type: admissionType,

      previous_school: getOptionalString(
        raw.previousSchool
      ),

      previous_qualification: getOptionalString(
        raw.previousQualification
      ),

      guardian_first_name: getString(
        raw.guardianFirstName
      ),

      guardian_middle_name: getOptionalString(
        raw.guardianMiddleName
      ),

      guardian_last_name: getString(
        raw.guardianLastName
      ),

      guardian_gender: getString(
        raw.guardianGender
      ),

      guardian_status: getString(
        raw.guardianStatus
      ),

      guardian_phone: getString(
        raw.guardianPhone
      ),

      guardian_email: getOptionalString(
        raw.guardianEmail
      ),

      attestation_date: attestationDate,

      passport_file: passportFile,
      signature_file: signatureFile,
    };

    /*
      Documents are sent without application_id.

      The RPC creates the application first and uses
      its new ID when inserting each document.
    */
    const documentsPayload: ApplicationDocumentPayload[] =
      [
        {
          doc_type: "academic_result",
          file: academicResultFile,
          original_name: null,
          mime_type: null,
        },
        {
          doc_type: "birth_or_age",
          file: birthCertificateFile,
          original_name: null,
          mime_type: null,
        },
      ];

    if (sponsorshipLetterFile) {
      documentsPayload.push({
        doc_type: "sponsorship_letter",
        file: sponsorshipLetterFile,
        original_name: null,
        mime_type: null,
      });
    }

    for (const document of supportingDocs) {
      documentsPayload.push({
        doc_type: document.doc_type,
        file: document.file,
        original_name:
          document.original_name ?? null,
        mime_type: document.mime_type ?? null,
      });
    }

    for (const file of legacySupportingFiles) {
      documentsPayload.push({
        doc_type: "supporting_optional",
        file,
        original_name: null,
        mime_type: null,
      });
    }

    /*
      The RPC inserts the application and all documents
      within one database transaction.
    */
    const {
      data: rpcData,
      error: rpcError,
    } = await supabase.rpc(
      "create_application_with_documents",
      {
        p_application: applicationPayload,
        p_documents: documentsPayload,
      }
    );

    /*
      PostgreSQL error 23505 means a unique index
      rejected the insert.

      Look up the matching application to determine
      whether this was a duplicate submission.
    */
    if (rpcError?.code === "23505") {
      const {
        data: conflictingApplication,
        error: conflictLookupError,
      } = await supabase
        .from("applications")
        .select(
          "id, application_no, status, created_at"
        )
        .eq("nin", nin)
        .eq("program_id", programId)
        .eq("session_id", activeSession.id)
        .maybeSingle<ExistingApplication>();

      if (conflictLookupError) {
        console.error(
          "[LOOKUP_CONFLICTING_APPLICATION_ERROR]",
          conflictLookupError
        );
      }

      if (conflictingApplication) {
        return duplicateApplicationResponse(
          conflictingApplication
        );
      }

      console.error(
        "[CREATE_APPLICATION_UNIQUE_CONFLICT]",
        rpcError
      );

      return NextResponse.json(
        {
          error:
            "A database conflict prevented the application from being submitted.",
          code: "APPLICATION_UNIQUE_CONFLICT",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Any other RPC error rolls back both the application
      and document inserts.
    */
    if (rpcError) {
      console.error(
        "[CREATE_APPLICATION_RPC_ERROR]",
        rpcError
      );

      return NextResponse.json(
        {
          error:
            "Application submission failed. No application or documents were saved.",
          code: "APPLICATION_TRANSACTION_FAILED",
        },
        {
          status: 500,
        }
      );
    }

    const application =
      rpcData as ExistingApplication | null;

    if (!application?.id) {
      console.error(
        "[CREATE_APPLICATION_RPC_INVALID_RESULT]",
        rpcData
      );

      return NextResponse.json(
        {
          error:
            "Application submission returned an invalid result.",
          code: "INVALID_APPLICATION_RESULT",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        application,
      },
      {
        status: 201,
      }
    );
  } catch (error: unknown) {
    console.error(
      "[CREATE_APPLICATION_FATAL_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Invalid request";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}