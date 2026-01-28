// /types/applications.ts

export type Gender = "male" | "female" | "other";
export type GuardianStatus = "father" | "mother" | "guardian" | "other";
export type Religion = "muslim" | "christian" | "other";
export type AdmissionType = "fresh" | "direct_entry";

export type StorageFileRef = {
  bucket: string;
  path: string;
  contentType?: string;
  size?: number;
  originalName?: string;
};

export interface ApplicationFormData {
  firstName: string;
  middleName: string;
  lastName: string;

  gender: Gender;
  dateOfBirth: string;

  email: string;
  phone: string;
  nin: string;
  specialNeeds: string;

  stateOfOrigin: string;
  lgaOfOrigin: string;
  religion: Religion;
  address: string;

  programId: string;
  classAppliedFor: string;
  admissionType: AdmissionType;

  previousSchool: string;
  previousQualification: string;

  guardianFirstName: string;
  guardianMiddleName: string;
  guardianLastName: string;
  guardianGender: Gender;
  guardianStatus: GuardianStatus;
  guardianPhone: string;
  guardianEmail: string;

  attestationDate: string;

  // REQUIRED FILES
  passportFile: StorageFileRef | null;
  signatureFile: StorageFileRef | null;
  academicResultFile: StorageFileRef | null;
  birthCertificateFile: StorageFileRef | null;

  // OPTIONAL
  sponsorshipLetterFile: StorageFileRef | null;
}
