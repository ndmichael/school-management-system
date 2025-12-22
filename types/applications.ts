// /types/applications.ts

export type Gender = "male" | "female" | "other";
export type GuardianStatus = "father" | "mother" | "guardian" | "other";
export type Religion = "muslim" | "christian" | "other";
export type AdmissionType = "fresh" | "direct_entry";

/**
 * Stored in DB jsonb columns (passport_file, signature_file, application_documents.file)
 */
export type StorageFileRef = {
  bucket: string;         // e.g. "applications"
  path: string;           // e.g. "passports/uuid.png"
  contentType?: string;   // e.g. "image/png"
  size?: number;          // bytes
  originalName?: string;  // original filename
};

export interface ApplicationFormData {
  firstName: string;
  middleName?: string | null;
  lastName: string;

  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD (DB: date)

  email: string;
  phone: string;
  nin: string;
  specialNeeds?: string;

  stateOfOrigin: string;
  lgaOfOrigin: string;
  religion: Religion;
  address: string;

  programId: string;
  classAppliedFor: string;

  // You’re using this to populate DB: application_type
  admissionType: AdmissionType;

  previousSchool?: string;
  previousQualification?: string;

  guardianFirstName: string;
  guardianMiddleName?: string | null;
  guardianLastName: string;
  guardianGender: Gender;
  guardianStatus: GuardianStatus;
  guardianPhone: string;
  guardianEmail?: string | null;

  attestationDate: string; // YYYY-MM-DD (DB: timestamptz)

  // ✅ Option B: JSON file refs
  passportFile: StorageFileRef | null;
  signatureFile: StorageFileRef | null;
  supportingFiles: StorageFileRef[];
}
