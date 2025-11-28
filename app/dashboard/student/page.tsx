'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export default function AcademicStaffStudentsPage() {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Demo student data
  const students = [
    {
      id: 'STU001',
      name: 'Jane Doe',
      matricNo: 'MAT2025001',
      department: 'Computer Science',
      level: '400',
      email: 'jane.doe@example.com',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=JaneDoe&backgroundColor=b6e3f4',
    },
    {
      id: 'STU002',
      name: 'John Smith',
      matricNo: 'MAT2025002',
      department: 'Mathematics',
      level: '300',
      email: 'john.smith@example.com',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=JohnSmith&backgroundColor=b6e3f4',
    },
    {
      id: 'STU003',
      name: 'Alice Johnson',
      matricNo: 'MAT2025003',
      department: 'Physics',
      level: '200',
      email: 'alice.johnson@example.com',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=AliceJohnson&backgroundColor=b6e3f4',
    },
  ];

  // Unique departments for filter
  const departments = Array.from(new Set(students.map((s) => s.department)));

  // Filter students by search and department
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.matricNo.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = departmentFilter ? s.department === departmentFilter : true;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="space-y-8">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search by name or matric"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border rounded-xl border-gray-300 focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border rounded-xl border-gray-300 focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[280px]">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Matric No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Department</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[100px]">Level</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[200px]">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <Image src={student.avatar} alt={student.name} fill className="rounded-full object-cover" />
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{student.matricNo}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.department}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.level}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 truncate">{student.email}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/academic_staff/student/${student.id}`}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Student"
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
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image src={student.avatar} alt={student.name} fill className="rounded-full object-cover" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{student.name}</p>
                <p className="text-sm text-gray-500">{student.matricNo}</p>
                <p className="text-sm text-gray-500">
                  {student.department} - {student.level}
                </p>
              </div>
            </div>
            <Link
              href={`/dashboard/academic_staff/student/${student.id}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="View Student"
            >
              <Eye className="w-5 h-5 text-gray-600" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
