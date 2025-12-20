'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';

type Semester = 'first' | 'second';

type Course = {
  code: string;
  title: string;
  credits: number;
};

type Session = {
  name: string;
  is_active: boolean | null;
};

type CourseOffering = {
  id: string;
  semester: Semester | string;
  is_published: boolean | null;
  courses: Course;
  sessions: Session;
};

type AssignmentRow = {
  id: string;
  course_offerings: CourseOffering;
};

const supabase = createClient();

export default function AcademicStaffResultsPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyOfferingId, setBusyOfferingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignedOfferings = async (): Promise<void> => {
      setLoading(true);

      const { data: auth, error: authErr } = await supabase.auth.getUser();
      console.log("AUTH UID:", auth.user?.id);
      if (authErr || !auth.user?.id) {
        setRows([]);
        setLoading(false);
        return;
      }

      const uid = auth.user.id;
      const raw = await supabase
  .from("course_offering_staff")
  .select("id, course_offering_id, staff_profile_id");

console.log("RAW ASSIGNMENTS:", raw.data, raw.error);

      const { data, error } = await supabase
        .from('course_offering_staff')
        .select(`
          id,
          course_offerings!inner (
            id,
            semester,
            is_published,
            courses!inner ( code, title, credits ),
            sessions!inner ( name, is_active )
          )
        `)
        .eq('staff_profile_id', uid) // ✅ critical fix
        .returns<AssignmentRow[]>();

      if (!error && data) setRows(data);
      else setRows([]);

      setLoading(false);
    };

    fetchAssignedOfferings();
  }, []);

  const activeSessionName = useMemo(() => {
    const active = rows.find((r) => r.course_offerings.sessions.is_active === true);
    return active?.course_offerings.sessions.name ?? null;
  }, [rows]);

  const togglePublish = async (offeringId: string, nextValue: boolean): Promise<void> => {
    setBusyOfferingId(offeringId);

    // optimistic UI
    setRows((prev) =>
      prev.map((r) =>
        r.course_offerings.id === offeringId
          ? { ...r, course_offerings: { ...r.course_offerings, is_published: nextValue } }
          : r
      )
    );

    const { error } = await supabase
      .from('course_offerings')
      .update({ is_published: nextValue })
      .eq('id', offeringId);

    if (error) {
      // rollback
      setRows((prev) =>
        prev.map((r) =>
          r.course_offerings.id === offeringId
            ? { ...r, course_offerings: { ...r.course_offerings, is_published: !nextValue } }
            : r
        )
      );
      alert(error.message);
    }

    setBusyOfferingId(null);
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading assigned offerings…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              Results
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage results for your assigned course offerings.
              {activeSessionName ? (
                <span className="ml-2 text-purple-700 font-semibold">
                  Active session: {activeSessionName}
                </span>
              ) : null}
            </p>
          </div>

          <Link
            href="/dashboard/academic_staff/results/grade-submission"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Grade Submission
          </Link>
        </div>
      </div>

      {/* Empty */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center">
          <p className="text-gray-900 font-semibold">No assigned offerings yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Ask an admin to assign you to a course offering.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[160px]">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[110px]">Credits</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Semester</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[160px]">Session</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Published</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {rows.map((r) => {
                  const offering = r.course_offerings;
                  const isPublished = offering.is_published === true;
                  const isBusy = busyOfferingId === offering.id;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-900">{offering.courses.code}</td>
                      <td className="px-6 py-4 text-gray-900">{offering.courses.title}</td>
                      <td className="px-6 py-4 text-gray-900">{offering.courses.credits}</td>
                      <td className="px-6 py-4 text-gray-900">{String(offering.semester)}</td>
                      <td className="px-6 py-4 text-gray-900">{offering.sessions.name}</td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => togglePublish(offering.id, !isPublished)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors ${
                            isPublished
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {isPublished ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Published
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Unpublished
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/academic_staff/results/${offering.id}`}
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
