export interface StudentUser {
  id: string;
  matricNo: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  program: string;
  level: string;
  department: string;
  cgpa: number;
  enrollmentDate: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  stateOfOrigin: string;
  nationality: string;
  status: 'active' | 'suspended' | 'graduated';
}

export interface StudentPayment {
  id: string;
  studentId: string;
  receiptNo?: string;
  amount: number;
  paymentType: string;
  semester: string;
  status: 'pending' | 'verified' | 'rejected';
  date: string;
  proofOfPayment?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  rejectionReason?: string;
  paymentMethod?: string;
}

export interface EnrolledCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  instructor: string;
  semester: string;
  grade?: string;
  status: 'ongoing' | 'completed';
}

export interface StudentResult {
  id: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string;
  gradePoint: number;
  semester: string;
  session: string;
}

// Sample student data
export const currentStudent: StudentUser = {
  id: 'STU001',
  matricNo: 'SYK/MLS/2022/001',
  name: 'Chioma Adebayo',
  email: 'chioma.adebayo@student.syk.edu.ng',
  phone: '+234 803 456 7890',
  avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chioma1&backgroundColor=b6e3f4',
  program: 'Medical Laboratory Science',
  level: '300 Level',
  department: 'Medical Laboratory Science',
  cgpa: 3.85,
  enrollmentDate: '2022-09-15',
  dateOfBirth: '2003-05-12',
  gender: 'Female',
  address: '45 Wuse Zone 3, Abuja FCT',
  stateOfOrigin: 'Lagos',
  nationality: 'Nigerian',
  status: 'active',
};

export const studentPayments: StudentPayment[] = [
  {
    id: 'PAY001',
    studentId: 'STU001',
    receiptNo: 'RCP-2024-001',
    amount: 150000,
    paymentType: 'Tuition Fee',
    semester: 'First Semester 2024/2025',
    status: 'verified',
    date: '2024-09-15',
    paymentMethod: 'Bank Transfer',
    verifiedBy: 'Admin',
    verifiedDate: '2024-09-16',
  },
  {
    id: 'PAY002',
    studentId: 'STU001',
    amount: 25000,
    paymentType: 'Laboratory Fee',
    semester: 'First Semester 2024/2025',
    status: 'pending',
    date: '2024-10-01',
    proofOfPayment: '/uploads/proof-pay002.jpg',
    paymentMethod: 'Online Payment',
  },
  {
    id: 'PAY003',
    studentId: 'STU001',
    amount: 15000,
    paymentType: 'Library Fee',
    semester: 'Second Semester 2023/2024',
    status: 'rejected',
    date: '2024-03-10',
    proofOfPayment: '/uploads/proof-pay003.pdf',
    rejectionReason: 'Payment receipt unclear. Please upload a clearer image.',
    paymentMethod: 'Cash',
  },
];

export const enrolledCourses: EnrolledCourse[] = [
  {
    id: 'EC001',
    code: 'MLS301',
    title: 'Clinical Chemistry II',
    credits: 3,
    instructor: 'Dr. Adebayo Johnson',
    semester: 'First Semester 2024/2025',
    status: 'ongoing',
  },
  {
    id: 'EC002',
    code: 'MLS302',
    title: 'Medical Microbiology',
    credits: 4,
    instructor: 'Prof. Chiamaka Okafor',
    semester: 'First Semester 2024/2025',
    status: 'ongoing',
  },
  {
    id: 'EC003',
    code: 'MLS303',
    title: 'Hematology',
    credits: 3,
    instructor: 'Dr. Mary Nwosu',
    semester: 'First Semester 2024/2025',
    status: 'ongoing',
  },
];

export const studentResults: StudentResult[] = [
  {
    id: 'RES001',
    courseCode: 'MLS201',
    courseTitle: 'Clinical Chemistry I',
    credits: 3,
    grade: 'A',
    gradePoint: 5.0,
    semester: 'First Semester',
    session: '2023/2024',
  },
  {
    id: 'RES002',
    courseCode: 'MLS202',
    courseTitle: 'Medical Parasitology',
    credits: 4,
    grade: 'A',
    gradePoint: 5.0,
    semester: 'First Semester',
    session: '2023/2024',
  },
  {
    id: 'RES003',
    courseCode: 'MLS203',
    courseTitle: 'Immunology',
    credits: 3,
    grade: 'B+',
    gradePoint: 4.5,
    semester: 'Second Semester',
    session: '2023/2024',
  },
];