// types/dashboard.ts
export type UserRole = 'admin' | 'student' | 'academic_staff' | 'non_academic_staff'
export type StaffUnit = "admissions" | "bursary" | "exams";

export interface DashboardUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  unit?: StaffUnit | null;
}
