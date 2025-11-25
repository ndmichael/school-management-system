'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, Edit, ArrowLeft, Check } from 'lucide-react';
import { studentResults, currentStudent } from '@/data/student';
import Link from 'next/link';

const gradeOptions = [
  { value: 'A', label: 'A' },
  { value: 'B+', label: 'B+' },
  { value: 'B', label: 'B' },
  { value: 'C+', label: 'C+' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'F', label: 'F' },
];

export default function CourseResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { courseId } = params;

  const [search, setSearch] = useState('');
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [gradeUpdates, setGradeUpdates] = useState<{ grade: string; gradePoint: number }>({
    grade: '',
    gradePoint: 0,
  });

  // Filter by student name or matric
  const filteredResults = studentResults.filter(
    (r) =>
      currentStudent.name.toLowerCase().includes(search.toLowerCase()) ||
      currentStudent.matricNo.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditClick = (result: typeof studentResults[0]) => {
    setEditingResultId(result.id);
    setGradeUpdates({ grade: result.grade, gradePoint: result.gradePoint });
  };

  const handleSave = () => {
    // Update the result locally (MVP)
    const resultIndex = studentResults.findIndex((r) => r.id === editingResultId);
    if (resultIndex !== -1) {
      studentResults[resultIndex].grade = gradeUpdates.grade;
      studentResults[resultIndex].gradePoint = gradeUpdates.gradePoint;
      alert('Grade updated successfully!');
    }
    setEditingResultId(null);
  };

  return (
    <div className="space-y-8">
      {/* Back + Header + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Results - Course</h1>
        <input
          type="text"
          placeholder="Search by student"
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Course Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[280px]">Course Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[100px]">Credits</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Grade</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Grade Point</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Semester</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Session</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResults.map(result => (
                <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{result.courseCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{result.courseTitle}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{result.credits}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{result.grade}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{result.gradePoint}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{result.semester}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{result.session}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(result)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit Grade"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <Link
                      href={`/dashboard/academic_staff/student/${currentStudent.id}/result/${result.id}`}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredResults.map(result => (
          <div key={result.id} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-900">{result.courseTitle}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(result)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit Grade"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <Link
                  href={`/dashboard/academic_staff/student/${currentStudent.id}/result/${result.id}`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </Link>
              </div>
            </div>
            <p className="text-sm text-gray-900">Code: {result.courseCode}</p>
            <p className="text-sm text-gray-900">Credits: {result.credits}</p>
            <p className="text-sm text-gray-900">Grade: {result.grade}</p>
            <p className="text-sm text-gray-900">Grade Point: {result.gradePoint}</p>
            <p className="text-sm text-gray-500">Semester: {result.semester}</p>
            <p className="text-sm text-gray-500">Session: {result.session}</p>
          </div>
        ))}
      </div>

      {/* Edit Grade Form (MVP modal-style) */}
      {editingResultId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[400px] space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Edit className="w-5 h-5" /> Update Grade
            </h2>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Grade</label>
              <select
                className="w-full px-4 py-2 border rounded-xl border-gray-300 focus:ring-2 focus:ring-primary-500"
                value={gradeUpdates.grade}
                onChange={(e) =>
                  setGradeUpdates({
                    ...gradeUpdates,
                    grade: e.target.value,
                    gradePoint: e.target.value === 'A' ? 5 : e.target.value === 'B+' ? 4.5 : e.target.value === 'B' ? 4 : e.target.value === 'C+' ? 3.5 : e.target.value === 'C' ? 3 : e.target.value === 'D' ? 2 : 0,
                  })
                }
              >
                {gradeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700">Grade Point</label>
              <input
                type="number"
                readOnly
                value={gradeUpdates.gradePoint}
                className="w-full px-4 py-2 border rounded-xl border-gray-300 bg-gray-100"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingResultId(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
