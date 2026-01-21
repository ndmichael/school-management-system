export type Profile = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nin: string | null;
  address: string | null;
  state_of_origin: string | null;
  lga_of_origin: string | null;
  religion: string | null;
  main_role: string;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  profile_id: string;
  matric_no: string;
  program_id: string | null;
  department_id: string | null;
  level: string | null;
  admission_session_id: string | null;
  cgpa: number | null;
  enrollment_date: string | null;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_status: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};
