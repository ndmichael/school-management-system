'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, ExternalLink, RefreshCw } from 'lucide-react';

type CourseRow = {
  course_offering_id: string;
  course_code: string;
  course_title: string;
  credits: number;
  session_name: string;
  semester: string;
  is_published: boolean | null;
  eligible_students: number;
  submitted_results: number;
  pending_results: number;
};

const supabase = createClient();

export default function AcademicStaffCoursesPage() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchCourses = async (): Promise<void> => {
    const { data, error } = await supabase.rpc('get_grade_submission_queue');

    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    if (Array.isArray(data)) {
      setRows(data as CourseRow[]);
    } else {
      setRows([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const total = rows.length;
    const published = rows.filter(r => r.is_published === true).length;
    const totalStudents = rows.reduce((sum, r) => sum + (r.eligible_students ?? 0), 0);
    return { total, published, totalStudents };
  }, [rows]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading assigned courses…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              My Courses
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Read-only view of your assigned course offerings.
            </p>

            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                Offerings: {summary.total}
              </span>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                Published: {summary.published}
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
                Students (total): {summary.totalStudents}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              refreshing
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Empty */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center">
          <p className="text-gray-900 font-semibold">No assigned courses yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Ask admin to assign you to course offerings.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[140px]">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[90px]">Credits</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[140px]">Semester</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[170px]">Session</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[140px]">Students</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Published</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[190px]">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {rows.map(r => {
                  const published = r.is_published === true;

                  return (
                    <tr key={r.course_offering_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-900">{r.course_code}</td>
                      <td className="px-6 py-4 text-gray-900">{r.course_title}</td>
                      <td className="px-6 py-4 text-gray-900">{r.credits}</td>
                      <td className="px-6 py-4 text-gray-900">{r.semester}</td>
                      <td className="px-6 py-4 text-gray-900">{r.session_name}</td>

                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700">
                          {r.eligible_students}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {published ? 'Published' : 'Unpublished'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/academic_staff/results/${r.course_offering_id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Grade sheet
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
