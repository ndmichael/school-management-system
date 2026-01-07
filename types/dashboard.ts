// types/dashboard.ts
export type UserRole = 'admin' | 'student' | 'academic_staff' | 'non_academic_staff'

export interface DashboardUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  unit?: string | null;
}
