export type AdmissionType = "fresh" | "direct_entry" | "transfer";
export type Gender = "male" | "female" | "other";
export type GuardianStatus = "father" | "mother" | "guardian" | "other";

export interface ApplicationFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  email: string;
  phone: string;
  nin?: string;
  specialNeeds?: string;
  stateOfOrigin: string;
  lgaOfOrigin: string;
  religion: string;
  address: string;
  programId: string;
  classAppliedFor: string;
  admissionType: AdmissionType;
  previousSchool?: string;
  previousQualification?: string;
  guardianFirstName: string;
  guardianMiddleName?: string;
  guardianLastName: string;
  guardianGender: Gender;
  guardianStatus: GuardianStatus;  // Updated as enum
  guardianPhone: string;
  guardianEmail: string;
  guardianImageId?: string;
  passportImageId?: string;
  supportingDocuments?: string[];
  attestationDate?: string;
}
