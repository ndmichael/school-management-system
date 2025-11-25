'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Eye, ArrowLeft } from 'lucide-react';
import { currentStudent, enrolledCourses } from '@/data/student';
import Link from 'next/link';

// Sample data: normally fetch from API by courseId
const courseStudents = [
  {
    id: 'STU001',
    name: currentStudent.name,
    matricNo: currentStudent.matricNo,
    email: currentStudent.email,
    phone: currentStudent.phone,
    avatar: currentStudent.avatar,
    status: currentStudent.status,
  },
  {
    id: 'STU002',
    name: 'John Okeke',
    matricNo: 'SYK/MLS/2022/002',
    email: 'john.okeke@student.syk.edu.ng',
    phone: '+234 803 123 4567',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=John1&backgroundColor=b6e3f4',
    status: 'active',
  },
];

export default function CourseStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const { courseId } = params;

  const [search, setSearch] = useState('');

  const filteredStudents = courseStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.matricNo.toLowerCase().includes(search.toLowerCase())
  );

  const course = enrolledCourses.find(c => c.id === courseId);

  return (
    <div className="space-y-8">
      {/* Back Button + Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Students - {course?.title || 'Course'}
        </h1>
        <input
          type="text"
          placeholder="Search by name or matric no"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-xl border-gray-300 focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[280px]">Student</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Matric No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <Image
                          src={student.avatar}
                          alt={student.name}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{student.matricNo}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      student.status === 'active' ? 'bg-green-100 text-green-700' :
                      student.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/academic_staff/student/${student.id}`}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No students found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredStudents.map(student => (
          <div key={student.id} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-900">{student.name}</span>
              <Link
                href={`/dashboard/academic_staff/student/${student.id}`}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="View Profile"
              >
                <Eye className="w-4 h-4 text-gray-600" />
              </Link>
            </div>
            <p className="text-sm text-gray-900">Matric No: {student.matricNo}</p>
            <p className="text-sm text-gray-500">Email: {student.email}</p>
            <p className="text-sm text-gray-500">Phone: {student.phone}</p>
            <p className="text-sm text-gray-500">
              Status: <span className={`px-2 py-1 rounded-full ${
                student.status === 'active' ? 'bg-green-100 text-green-700' :
                student.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              } text-xs font-semibold`}>{student.status}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
