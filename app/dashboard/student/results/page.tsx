'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Select } from '@/components/shared/Select';
import { Download } from 'lucide-react';

type Semester = 'first' | 'second';
type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

type Course = {
  code: string;
  title: string;
  credits: number;
};

type Session = {
  name: string;
};

type CourseOffering = {
  semester: Semester;
  courses: Course;
  sessions: Session;
};

type ResultRow = {
  id: string;
  grade_letter: GradeLetter;
  grade_points: number;
  course_offerings: CourseOffering;
};

type Option<T extends string> = Readonly<{ value: T; label: string }>;

const supabase = createClient();

export default function StudentResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Match your Select: T | ""
  const [selectedSemester, setSelectedSemester] = useState<Semester | ''>('');
  const [selectedSession, setSelectedSession] = useState<string | ''>('');

  useEffect(() => {
    const fetchResults = async () => {
      const { data, error } = await supabase
        .from('results')
        .select(`
          id,
          grade_letter,
          grade_points,
          course_offerings!inner (
            semester,
            courses!inner (
              code,
              title,
              credits
            ),
            sessions!inner (
              name
            )
          )
        `)
        .returns<ResultRow[]>();

      if (!error && data) setResults(data);
      setLoading(false);
    };

    fetchResults();
  }, []);

  const semesterOptions = useMemo<ReadonlyArray<Option<Semester>>>(() => {
    const values = Array.from(new Set(results.map(r => r.course_offerings.semester)));
    return values.map(v => ({ value: v, label: v.toUpperCase() }));
  }, [results]);

  const sessionOptions = useMemo<ReadonlyArray<Option<string>>>(() => {
    const values = Array.from(new Set(results.map(r => r.course_offerings.sessions.name)));
    return values.map(v => ({ value: v, label: v }));
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesSemester = selectedSemester ? r.course_offerings.semester === selectedSemester : true;
      const matchesSession = selectedSession ? r.course_offerings.sessions.name === selectedSession : true;
      return matchesSemester && matchesSession;
    });
  }, [results, selectedSemester, selectedSession]);

  const semesterGPA = useMemo(() => {
    if (!filteredResults.length) return null;

    let totalPoints = 0;
    let totalCredits = 0;

    for (const r of filteredResults) {
      const credits = r.course_offerings.courses.credits;
      totalCredits += credits;
      totalPoints += r.grade_points * credits;
    }

    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : null;
  }, [filteredResults]);

  const cumulativeGPA = useMemo(() => {
    if (!results.length) return null;

    let totalPoints = 0;
    let totalCredits = 0;

    for (const r of results) {
      const credits = r.course_offerings.courses.credits;
      totalCredits += credits;
      totalPoints += r.grade_points * credits;
    }

    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : null;
  }, [results]);

  const handleDownloadPDF = () => {
    alert('Next step: server-side PDF download');
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading results…</div>;
  }

  if (!results.length) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold text-gray-800">Results not published yet</p>
        <p className="mt-1 text-sm text-gray-500">Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Results</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select<Semester>
          label="Semester"
          options={semesterOptions}
          value={selectedSemester}
          onChange={setSelectedSemester}
        />

        <Select<string>
          label="Session"
          options={sessionOptions}
          value={selectedSession}
          onChange={setSelectedSession}
        />
      </div>

      {/* GPA SUMMARY */}
      <div className="flex flex-wrap gap-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
        {semesterGPA && (
          <div>
            <p className="text-sm font-semibold text-blue-700">Semester GPA</p>
            <p className="text-2xl font-bold text-blue-900">{semesterGPA}</p>
          </div>
        )}
        {cumulativeGPA && (
          <div>
            <p className="text-sm font-semibold text-blue-700">Cumulative GPA</p>
            <p className="text-2xl font-bold text-blue-900">{cumulativeGPA}</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white lg:block">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">Course Code</th>
              <th className="px-6 py-4 text-left">Course Title</th>
              <th className="px-6 py-4 text-center">Credits</th>
              <th className="px-6 py-4 text-center">Grade</th>
              <th className="px-6 py-4 text-center">Grade Point</th>
              <th className="px-6 py-4 text-center">Semester</th>
              <th className="px-6 py-4 text-center">Session</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {filteredResults.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-gray-900">
                  {r.course_offerings.courses.code}
                </td>
                <td className="px-6 py-4 text-gray-900">
                  {r.course_offerings.courses.title}
                </td>
                <td className="px-6 py-4 text-center text-gray-900">
                  {r.course_offerings.courses.credits}
                </td>
                <td className="px-6 py-4 text-center font-semibold text-gray-900">
                  {r.grade_letter}
                </td>
                <td className="px-6 py-4 text-center text-gray-900">
                  {r.grade_points.toFixed(1)}
                </td>
                <td className="px-6 py-4 text-center text-gray-900">
                  {r.course_offerings.semester}
                </td>
                <td className="px-6 py-4 text-center text-gray-900">
                  {r.course_offerings.sessions.name}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!filteredResults.length && (
          <div className="py-12 text-center text-gray-600">No results match your filters</div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-4 lg:hidden">
        {filteredResults.map(r => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{r.course_offerings.courses.title}</p>
                <p className="text-sm text-gray-600">
                  {r.course_offerings.courses.code} • {r.course_offerings.courses.credits} credits
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {r.course_offerings.semester} • {r.course_offerings.sessions.name}
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                {r.grade_letter} ({r.grade_points.toFixed(1)})
              </span>
            </div>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        ))}

        {!filteredResults.length && (
          <div className="py-12 text-center text-gray-600">No results match your filters</div>
        )}
      </div>
    </div>
  );
}
