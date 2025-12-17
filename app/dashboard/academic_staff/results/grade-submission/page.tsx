'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ClipboardCheck, ExternalLink, RefreshCw } from 'lucide-react';

type QueueRow = {
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

export default function GradeSubmissionPage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchQueue = async (): Promise<void> => {
    const { data, error } = await supabase.rpc('get_grade_submission_queue');

    if (error) {
      alert(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    // ✅ Runtime type guard (no any)
    if (Array.isArray(data)) {
      setRows(data as QueueRow[]);
    } else {
      // If RPC returns a single object unexpectedly, normalize
      setRows([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const totalOfferings = rows.length;
    const totalPending = rows.reduce((sum, r) => sum + Math.max(0, r.pending_results), 0);
    const complete = rows.filter(r => r.pending_results <= 0).length;
    return { totalOfferings, totalPending, complete };
  }, [rows]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchQueue();
    setRefreshing(false);
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading grade submission…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-purple-600" />
              Grade Submission
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Track pending results for your assigned offerings.
            </p>

            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                Offerings: {summary.totalOfferings}
              </span>
              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                Pending: {summary.totalPending}
              </span>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                Complete: {summary.complete}
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

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center">
          <p className="text-gray-900 font-semibold">Nothing to submit</p>
          <p className="text-sm text-gray-600 mt-1">
            You have no assigned offerings (or none match the current session).
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[160px]">Session</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[130px]">Eligible</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[130px]">Submitted</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[130px]">Pending</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[170px]">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {rows.map(r => {
                  const pending = Math.max(0, r.pending_results);
                  const isComplete = pending === 0;

                  return (
                    <tr key={r.course_offering_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-900">{r.course_code}</td>
                      <td className="px-6 py-4 text-gray-900">{r.course_title}</td>
                      <td className="px-6 py-4 text-gray-900">{r.credits}</td>
                      <td className="px-6 py-4 text-gray-900">{r.semester}</td>
                      <td className="px-6 py-4 text-gray-900">{r.session_name}</td>
                      <td className="px-6 py-4 text-gray-900">{r.eligible_students}</td>
                      <td className="px-6 py-4 text-gray-900">{r.submitted_results}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            isComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {pending}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/academic_staff/results/${r.course_offering_id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open grade sheet
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
