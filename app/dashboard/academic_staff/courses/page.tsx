'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye } from 'lucide-react';

// Sample course data (replace with real API or data later)
const staffCourses = [
  {
    id: 'C001',
    code: 'MLS301',
    title: 'Clinical Chemistry II',
    semester: 'First Semester 2024/2025',
    studentsEnrolled: 25,
  },
  {
    id: 'C002',
    code: 'MLS302',
    title: 'Medical Microbiology',
    semester: 'First Semester 2024/2025',
    studentsEnrolled: 30,
  },
];

export default function StaffCoursesPage() {
  const [filterSemester, setFilterSemester] = useState('');

  const semesters = Array.from(new Set(staffCourses.map(c => c.semester)));

  const filteredCourses = filterSemester
    ? staffCourses.filter(c => c.semester === filterSemester)
    : staffCourses;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <select
          className="px-4 py-2 border rounded-xl border-gray-300 focus:ring-2 focus:ring-primary-500"
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
        >
          <option value="">All Semesters</option>
          {semesters.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[200px]">Semester</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[160px]">Students</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCourses.map(course => (
                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{course.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{course.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{course.semester}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{course.studentsEnrolled}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/academic_staff/courses/${course.id}`}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Students"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No courses found for the selected semester</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredCourses.map(course => (
          <div key={course.id} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-900">{course.title}</span>
              <Link
                href={`/dashboard/academic_staff/courses/${course.id}`}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="View Students"
              >
                <Eye className="w-4 h-4 text-gray-600" />
              </Link>
            </div>
            <p className="text-sm text-gray-900">Code: {course.code}</p>
            <p className="text-sm text-gray-500">Semester: {course.semester}</p>
            <p className="text-sm text-gray-500">Students: {course.studentsEnrolled}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
