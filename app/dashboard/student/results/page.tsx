'use client';

import { useState } from 'react';
import { Select } from '@/components/shared/Select';
import { studentResults } from '@/data/student';
import { Download, TrendingUp } from 'lucide-react';

export default function StudentResultsPage() {
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const semesterOptions = Array.from(new Set(studentResults.map(r => r.semester))).map(sem => ({
    value: sem,
    label: sem,
  }));

  const sessionOptions = Array.from(new Set(studentResults.map(r => r.session))).map(session => ({
    value: session,
    label: session,
  }));

  const filteredResults = studentResults.filter(result => {
    return (
      (selectedSemester ? result.semester === selectedSemester : true) &&
      (selectedSession ? result.session === selectedSession : true)
    );
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Results</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select
          label="Semester"
          options={semesterOptions}
          value={selectedSemester}
          onChange={e => setSelectedSemester(e.target.value)}
        />
        <Select
          label="Session"
          options={sessionOptions}
          value={selectedSession}
          onChange={e => setSelectedSession(e.target.value)}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Course Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[300px]">Course Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[100px]">Credits</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[80px]">Grade</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Grade Point</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Semester</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Session</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResults.map(result => (
                <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-900">{result.courseCode}</td>
                  <td className="px-6 py-4">{result.courseTitle}</td>
                  <td className="px-6 py-4">{result.credits}</td>
                  <td className={`px-6 py-4 font-semibold ${result.grade.startsWith('A') ? 'text-green-700' : 'text-gray-900'}`}>
                    {result.grade}
                  </td>
                  <td className="px-6 py-4">{result.gradePoint.toFixed(1)}</td>
                  <td className="px-6 py-4">{result.semester}</td>
                  <td className="px-6 py-4">{result.session}</td>
                  <td className="px-6 py-4">
                    <a
                      href="#"
                      className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredResults.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No results found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredResults.map(result => (
          <div key={result.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-gray-900">{result.courseTitle}</p>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${result.grade.startsWith('A') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {result.grade}
              </span>
            </div>
            <p className="text-sm text-gray-600">{result.courseCode} | {result.credits} credits</p>
            <p className="text-xs text-gray-500">{result.semester} | {result.session}</p>
            <a
              href="#"
              className="mt-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors text-center flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          </div>
        ))}

        {filteredResults.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}
