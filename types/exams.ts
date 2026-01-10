export type Enrollment = {
  id: string;
  students: {
    matric_no: string;
    level: string | null;
    profiles: {
      first_name: string;
      last_name: string;
    };
    program?: {
      name: string;
    } | null;
  };
};
