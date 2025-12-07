// types/session.ts

export type SessionStatus = 'active' | 'completed' | 'upcoming';

export type SessionRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  registration_start_date: string | null;
  registration_end_date: string | null;
  application_fee: number | null;
  max_applications: number | null;
  is_active: boolean | null;
  current_semester: string | null;
  students_count: number | null;
  created_at: string;
  updated_at: string;
};

export type SessionUI = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SessionStatus;
  currentSemester: string;
  students: number;
};

