'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  BookOpen,
  ExternalLink,
  RefreshCw,
  Users,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-toastify';

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

function badgeClass(published: boolean): string {
  return published
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

export default function AcademicStaffCoursesPage() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;

    try {
      if (!silent) setRefreshing(true);

      const { data, error } = await supabase.rpc('get_grade_submission_queue');

      if (error) throw error;

      const nextRows = Array.isArray(data) ? (data as CourseRow[]) : [];
      setRows(nextRows);
    } catch (err) {
      console.error(err);
      setRows([]);
      toast.error('Failed to load your assigned courses.');
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      // initial load: loading is already true, so do NOT set it again
      try {
        const { data, error } = await supabase.rpc('get_grade_submission_queue');
        if (!alive) return;

        if (error) throw error;

        setRows(Array.isArray(data) ? (data as CourseRow[]) : []);
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setRows([]);
        toast.error('Failed to load your assigned courses.');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const summary = useMemo(() => {
    const total = rows.length;
    const published = rows.filter(r => r.is_published === true).length;
    const students = rows.reduce((sum, r) => sum + (r.eligible_students ?? 0), 0);
    const pending = rows.reduce((sum, r) => sum + (r.pending_results ?? 0), 0);
    const submitted = rows.reduce((sum, r) => sum + (r.submitted_results ?? 0), 0);

    return { total, published, students, pending, submitted };
  }, [rows]);

  const onRefresh = async (): Promise<void> => {
    await fetchCourses();
  };

  if (loading) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 ring-1 ring-blue-100" />
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-slate-100" />
                <div className="h-3 w-72 rounded bg-slate-100" />
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="h-3 w-24 rounded bg-slate-200/60" />
                  <div className="mt-3 h-6 w-16 rounded bg-slate-200/60" />
                </div>
              ))}
            </div>

            <div className="mt-8 text-center text-sm text-slate-600">
              Loading your assigned courses…
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-purple-50 via-white to-white p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100/70 ring-1 ring-purple-200">
                    <BookOpen className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      My Courses
                    </h1>
                    <p className="text-sm text-slate-600">
                      Your assigned course offerings — open a grade sheet to submit results.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat
                    icon={<ClipboardList className="h-4 w-4 text-slate-700" />}
                    label="Offerings"
                    value={summary.total}
                  />
                  <Stat
                    icon={<CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                    label="Published"
                    value={summary.published}
                  />
                  <Stat
                    icon={<Users className="h-4 w-4 text-blue-700" />}
                    label="Students"
                    value={summary.students}
                  />
                  <Stat
                    icon={<ClipboardList className="h-4 w-4 text-orange-700" />}
                    label="Pending grades"
                    value={summary.pending}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
                  refreshing
                    ? 'cursor-not-allowed bg-slate-100 text-slate-500'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {rows.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <BookOpen className="h-6 w-6 text-slate-600" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-900">
              No assigned courses yet
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Ask an admin to assign you to a course offering.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <Th>Course</Th>
                    <Th>Session</Th>
                    <Th>Semester</Th>
                    <Th>Students</Th>
                    <Th>Progress</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {rows.map(r => {
                    const published = r.is_published === true;

                    return (
                      <tr key={r.course_offering_id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
                                {r.course_code}
                              </span>
                              <span className="text-sm font-semibold text-slate-900">
                                {r.course_title}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              {r.credits} credit{r.credits === 1 ? '' : 's'}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-700">
                          {r.session_name}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-700">
                          {r.semester}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-purple-700 ring-1 ring-blue-100">
                            {r.eligible_students}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-700">
                            {r.submitted_results} submitted / {r.pending_results} pending
                          </div>
                          <div className="mt-2 h-2 w-full max-w-[11rem] overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                            <div
                              className="h-full bg-purple-600"
                              style={{
                                width: `${percent(r.submitted_results, r.eligible_students)}%`,
                              }}
                            />
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold ${badgeClass(published)}`}>
                            {published ? 'Published' : 'Unpublished'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/academic_staff/results/${r.course_offering_id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open grade sheet
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-600">
              Tip: Use <span className="font-semibold text-slate-800">Pending grades</span> to prioritize what needs submission first.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        'px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </th>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function percent(numer: number, denom: number): number {
  if (!Number.isFinite(numer) || !Number.isFinite(denom) || denom <= 0) return 0;
  const raw = (numer / denom) * 100;
  if (raw < 0) return 0;
  if (raw > 100) return 100;
  return Math.round(raw);
}
