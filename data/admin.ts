export const studentsData = [
  {
    id: 'STU001',
    name: 'Chioma Adebayo',
    email: 'chioma.adebayo@student.syk.edu.ng',
    phone: '+234 803 456 7890',
    program: 'Medical Laboratory Science',
    level: '300 Level',
    status: 'active',
    enrollmentDate: '2022-09-15',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chioma1&backgroundColor=b6e3f4'
  },
  {
    id: 'STU002',
    name: 'Ibrahim Musa',
    email: 'ibrahim.musa@student.syk.edu.ng',
    phone: '+234 805 123 4567',
    program: 'Community Health Extension',
    level: '200 Level',
    status: 'active',
    enrollmentDate: '2023-09-10',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ibrahim2&backgroundColor=c0aede'
  },
  {
    id: 'STU003',
    name: 'Blessing Okonkwo',
    email: 'blessing.okonkwo@student.syk.edu.ng',
    phone: '+234 807 890 1234',
    program: 'Pharmacy Technology',
    level: '100 Level',
    status: 'active',
    enrollmentDate: '2024-09-05',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Blessing3&backgroundColor=ffd5dc'
  },
  {
    id: 'STU004',
    name: 'Michael Adebayo',
    email: 'michael.adebayo@student.syk.edu.ng',
    phone: '+234 809 234 5678',
    program: 'Health Information Management',
    level: '300 Level',
    status: 'suspended',
    enrollmentDate: '2022-09-15',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Michael4&backgroundColor=ffdfbf'
  },
  {
    id: 'STU005',
    name: 'Fatima Aliyu',
    email: 'fatima.aliyu@student.syk.edu.ng',
    phone: '+234 810 345 6789',
    program: 'Environmental Health',
    level: '200 Level',
    status: 'active',
    enrollmentDate: '2023-09-10',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Fatima5&backgroundColor=d1d4f9'
  },
];

export const staffData = [
  {
    id: 'STF001',
    name: 'Dr. Adebayo Johnson',
    email: 'adebayo.johnson@syk.edu.ng',
    phone: '+234 803 111 2222',
    department: 'Medical Laboratory Science',
    role: 'Academic Staff',
    position: 'Senior Lecturer',
    status: 'active',
    hireDate: '2015-08-01',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=AdebayoJohnson&backgroundColor=b6e3f4'
  },
  {
    id: 'STF002',
    name: 'Prof. Chiamaka Okafor',
    email: 'chiamaka.okafor@syk.edu.ng',
    phone: '+234 805 333 4444',
    department: 'Community Health',
    role: 'Academic Staff',
    position: 'Professor',
    status: 'active',
    hireDate: '2010-09-01',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=ChiamakaOkafor&backgroundColor=ffd5dc'
  },
  {
    id: 'STF003',
    name: 'Mr. David Eze',
    email: 'david.eze@syk.edu.ng',
    phone: '+234 807 555 6666',
    department: 'Administration',
    role: 'Non-Academic Staff',
    position: 'Admin Officer',
    status: 'active',
    hireDate: '2018-03-15',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=DavidEze&backgroundColor=c0aede'
  },
];

export const coursesData = [
  {
    id: 'CRS001',
    code: 'MLS301',
    title: 'Clinical Chemistry II',
    program: 'Medical Laboratory Science',
    level: '300 Level',
    credits: 3,
    semester: 'First Semester',
    instructor: 'Dr. Adebayo Johnson',
    students: 42,
    status: 'active'
  },
  {
    id: 'CRS002',
    code: 'CHE201',
    title: 'Community Health Practice',
    program: 'Community Health Extension',
    level: '200 Level',
    credits: 4,
    semester: 'First Semester',
    instructor: 'Prof. Chiamaka Okafor',
    students: 65,
    status: 'active'
  },
  {
    id: 'CRS003',
    code: 'PHT101',
    title: 'Pharmaceutical Calculations',
    program: 'Pharmacy Technology',
    level: '100 Level',
    credits: 2,
    semester: 'First Semester',
    instructor: 'Dr. Mary Nwosu',
    students: 38,
    status: 'active'
  },
];

export const departmentsData = [
  {
    id: 'DEPT001',
    name: 'Medical Laboratory Science',
    code: 'MLS',
    hod: 'Dr. Adebayo Johnson',
    staff: 12,
    students: 248,
    programs: 1,
    status: 'active',
    established: '2005'
  },
  {
    id: 'DEPT002',
    name: 'Community Health',
    code: 'CHE',
    hod: 'Prof. Chiamaka Okafor',
    staff: 15,
    students: 320,
    programs: 1,
    status: 'active',
    established: '2003'
  },
  {
    id: 'DEPT003',
    name: 'Pharmacy Technology',
    code: 'PHT',
    hod: 'Dr. Mary Nwosu',
    staff: 10,
    students: 195,
    programs: 1,
    status: 'active',
    established: '2008'
  },
];

export const sessionsData = [
  {
    id: 'SES001',
    name: '2024/2025',
    startDate: '2024-09-01',
    endDate: '2025-08-31',
    currentSemester: 'First Semester',
    status: 'active',
    students: 2547
  },
  {
    id: 'SES002',
    name: '2023/2024',
    startDate: '2023-09-01',
    endDate: '2024-08-31',
    currentSemester: 'Second Semester',
    status: 'completed',
    students: 2380
  },
  {
    id: 'SES003',
    name: '2022/2023',
    startDate: '2022-09-01',
    endDate: '2023-08-31',
    currentSemester: 'Second Semester',
    status: 'completed',
    students: 2245
  },
];

export const receiptsData = [
  {
    id: 'RCP001',
    receiptNo: 'RCP-2024-001',
    studentId: 'STU001',
    studentName: 'Chioma Adebayo',
    amount: 150000,
    paymentType: 'Tuition Fee',
    paymentMethod: 'Bank Transfer',
    date: '2024-09-15',
    status: 'verified',
    semester: 'First Semester 2024/2025'
  },
  {
    id: 'RCP002',
    receiptNo: 'RCP-2024-002',
    studentId: 'STU002',
    studentName: 'Ibrahim Musa',
    amount: 150000,
    paymentType: 'Tuition Fee',
    paymentMethod: 'Online Payment',
    date: '2024-09-16',
    status: 'verified',
    semester: 'First Semester 2024/2025'
  },
  {
    id: 'RCP003',
    receiptNo: 'RCP-2024-003',
    studentId: 'STU003',
    studentName: 'Blessing Okonkwo',
    amount: 150000,
    paymentType: 'Tuition Fee',
    paymentMethod: 'Cash',
    date: '2024-09-17',
    status: 'pending',
    semester: 'First Semester 2024/2025'
  },
];

export type Student = typeof studentsData[0];
export type Staff = typeof staffData[0];
export type Course = typeof coursesData[0];
export type Department = typeof departmentsData[0];
export type Session = typeof sessionsData[0];
export type Receipt = typeof receiptsData[0];