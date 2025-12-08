// /types/applications.ts

export type Gender = "male" | "female" | "other";
export type GuardianStatus = "father" | "mother" | "guardian" | "other";
export type Religion = "muslim" | "christian" | "other";
export type AdmissionType = "fresh" | "direct_entry";


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
  guardianGender: Gender;              // or a separate GuardianGender type if you prefer
  guardianStatus: GuardianStatus;
  guardianPhone: string;

  passportImageId: string;
  supportingDocuments: string[];

  attestationDate: string;
}
