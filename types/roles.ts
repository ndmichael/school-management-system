// lib/types.ts
export type Role =
  | "super_admin"
  | "admin"
  | "student"
  | "academic_staff"
  | "non_academic_staff";

export interface UserProfile {
  $id: string;        // Appwrite document id (or custom)
  userId: string;     // Appwrite auth user id
  fullName?: string;
  email?: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}
