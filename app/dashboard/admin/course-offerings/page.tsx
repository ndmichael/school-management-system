'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublishToggleButton from './_components/PublishToggleButton'
import {
  Plus,
  RefreshCw,
  Eye,
  Users,
} from 'lucide-react';

type OfferingRow = {
  course_offering_id: string;
  course_code: string;
  course_title: string;
  credits: number;
  session_name: string;
  session_active: boolean;
  semester: string;
  program_id: string | null;
  level: string | null;
  is_published: boolean;
  eligible_students: number;
  submitted_results: number;
  pending_results: number;
  assigned_staff: number;
};

export default function AdminCourseOfferingsPage() {
  const [rows, setRows] = useState<OfferingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOfferings = async (): Promise<void> => {
    try {
      setError(null);
      const res = await fetch('/api/admin/course-offerings', {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load course offerings');
      }

      const data = (await res.json()) as OfferingRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Unable to load course offerings.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchOfferings();
    setRefreshing(false);
  };

  const onTogglePublish = async (
    offeringId: string,
    current: boolean
  ): Promise<void> => {
    // optimistic UI
    setRows(prev =>
      prev.map(r =>
        r.course_offering_id === offeringId
          ? { ...r, is_published: !current }
          : r
      )
    );

    const res = await fetch(`/api/admin/course-offerings/${offeringId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !current }),
    });

    if (!res.ok) {
      // rollback
      setRows(prev =>
        prev.map(r =>
          r.course_offering_id === offeringId
            ? { ...r, is_published: current }
            : r
        )
      );
      alert('Failed to update publish status');
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading course offerings…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Offerings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage offerings per session & semester.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold border ${
              refreshing
                ? 'bg-gray-100 text-gray-500'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Link
            href="/dashboard/admin/course-offerings/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
          >
            <Plus className="w-4 h-4" />
            Create Offering
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="font-semibold text-gray-900">No course offerings yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Create your first offering to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Course</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Session</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Semester</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Scope</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Students</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Staff</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Published</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {rows.map(r => (
                  <tr key={r.course_offering_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        {r.course_code} — {r.course_title}
                      </p>
                      <p className="text-xs text-gray-600">{r.credits} credits</p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          r.session_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {r.session_name}
                      </span>
                    </td>

                    <td className="px-6 py-4">{r.semester}</td>

                    <td className="px-6 py-4 text-sm">
                      <div>Program: {r.program_id ? 'Specific' : 'All'}</div>
                      <div>Level: {r.level ?? 'All'}</div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <div>Total: {r.eligible_students}</div>
                      <div className="text-xs text-gray-600">
                        Submitted: {r.submitted_results} / Pending: {r.pending_results}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-gray-500" />
                        {r.assigned_staff}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <PublishToggleButton
                        offeringId={r.course_offering_id}
                        isPublished={r.is_published}
                    />

                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/admin/course-offerings/${r.course_offering_id}`}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </Link>

                        <Link
                          href={`/dashboard/admin/course-offerings/${r.course_offering_id}/assign-staff`}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Assign Staff
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
