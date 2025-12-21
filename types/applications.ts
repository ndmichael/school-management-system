// /types/applications.ts

export type Gender = "male" | "female" | "other";
export type GuardianStatus = "father" | "mother" | "guardian" | "other";
export type Religion = "muslim" | "christian" | "other";
export type AdmissionType = "fresh" | "direct_entry";

/**
 * Store ONLY storage paths in form state (recommended).
 * Example: "passports/uuid.png", "documents/uuid.pdf"
 */
export interface ApplicationFormData {
  firstName: string;
  middleName?: string | null;
  lastName: string;

  gender: Gender;
  dateOfBirth: string;

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

  attestationDate: string;

  // ✅ NEW (fixes your TS errors)
  passportPath: string;
  supportingPaths: string[];

  // ✅ Legacy (keep so older code doesn’t break if still referenced anywhere)
  passportImageId?: string;
  supportingDocuments?: string[];
}
