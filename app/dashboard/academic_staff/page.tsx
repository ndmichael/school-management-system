import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { toPublicImageSrc, type StoredFile } from '@/lib/storage-images';
import {
  BookOpen,
  ClipboardCheck,
  Calendar,
  Clock,
  Users,
  ChevronRight,
} from 'lucide-react';

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_file: StoredFile | null;
  main_role: 'admin' | 'student' | 'academic_staff' | 'non_academic_staff';
};

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
  session_active?: boolean | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function isString(v: unknown): v is string {
  return typeof v === 'string';
}
function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function isBoolOrNull(v: unknown): v is boolean | null {
  return v === null || typeof v === 'boolean';
}

function isQueueRow(v: unknown): v is QueueRow {
  if (!isRecord(v)) return false;

  return (
    isString(v.course_offering_id) &&
    isString(v.course_code) &&
    isString(v.course_title) &&
    isNumber(v.credits) &&
    isString(v.session_name) &&
    isString(v.semester) &&
    isBoolOrNull(v.is_published) &&
    isNumber(v.eligible_students) &&
    isNumber(v.submitted_results) &&
    isNumber(v.pending_results) &&
    (v.session_active === undefined || isBoolOrNull(v.session_active))
  );
}

function badgeClass(kind: 'purple' | 'blue' | 'orange' | 'green' | 'gray'): string {
  switch (kind) {
    case 'purple':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'blue':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'orange':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'green':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function dicebearFallback(seed: string): string {
  const safe = encodeURIComponent(seed || 'Staff');
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${safe}&backgroundColor=b6e3f4`;
}

export default async function AcademicStaffDashboard() {
  const supabase = await createClient();

  // 1) auth (server)
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) redirect('/login');

  // 2) load staff profile (for name + avatar)
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_file, main_role')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (profErr || !profile) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-700">Profile not found.</p>
        {profErr?.message ? <p className="mt-1 text-xs text-gray-500">{profErr.message}</p> : null}
      </div>
    );
  }

  // optional: guard role (recommended)
  if (profile.main_role !== 'academic_staff') {
    redirect('/dashboard');
  }

  const staffName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Academic Staff';
  const avatar =
    toPublicImageSrc(supabase, profile.avatar_file, '') ||
    dicebearFallback(staffName);

  // 3) dashboard queue (RPC)
  const { data: rpcData, error } = await supabase.rpc('get_grade_submission_queue');

  const rows: QueueRow[] = Array.isArray(rpcData) ? rpcData.filter(isQueueRow) : [];
  const safeRows = error ? [] : rows;

  const assignedCourses = safeRows.length;
  const eligibleStudents = safeRows.reduce((sum, r) => sum + r.eligible_students, 0);
  const pendingGrades = safeRows.reduce((sum, r) => sum + r.pending_results, 0);

  const scheduleList = [...safeRows].sort((a, b) => {
    const aActive = a.session_active === true ? 1 : 0;
    const bActive = b.session_active === true ? 1 : 0;
    return bActive - aActive;
  });

  const gradeQueue = [...safeRows]
    .sort((a, b) => b.pending_results - a.pending_results)
    .slice(0, 6);

  const stats = [
    {
      label: 'Assigned Courses',
      value: String(assignedCourses),
      subtitle: 'From your assignments',
      icon: BookOpen,
      color: 'bg-purple-600',
    },
    {
      label: 'Students (Eligible)',
      value: String(eligibleStudents),
      subtitle: 'Across assigned offerings',
      icon: Users,
      color: 'bg-indigo-600',
    },
    {
      label: 'Pending Grades',
      value: String(pendingGrades),
      subtitle: 'Not submitted yet',
      icon: ClipboardCheck,
      color: 'bg-orange-500',
    },
  ] as const;

  return (
    <div className="space-y-6 max-w-full">
      {/* Header / Primary Actions */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-purple-600 via-purple-700 to-indigo-600 p-8 text-white">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
              <Image src={avatar} alt={staffName} fill sizes="56px" className="object-cover" />
            </div>
            <div>
              <h2 className="text-3xl font-bold leading-tight">Academic Staff</h2>
              <p className="text-purple-100">
                Welcome, <span className="font-semibold text-white">{staffName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/academic_staff/courses"
              className="px-6 py-2.5 bg-white text-purple-700 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
            >
              My Courses
            </Link>

            <Link
              href="/dashboard/academic_staff/results/grade-submission"
              className="px-6 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border border-white/20 hover:bg-white/20 transition-colors"
            >
              Grade Submission
            </Link>
          </div>
        </div>

        {error ? (
          <p className="relative mt-4 text-sm text-white/90">
            ⚠️ Could not load dashboard stats ({error.message})
          </p>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-purple-200 hover:shadow-xl"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${stat.color} transition-transform group-hover:scale-110`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-1 text-3xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm font-medium text-gray-900">{stat.label}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assigned Offerings */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 overflow-hidden">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Assigned Offerings
            </h3>

            <Link
              href="/dashboard/academic_staff/courses"
              className="text-sm font-medium text-purple-700 hover:text-purple-800"
            >
              View all
            </Link>
          </div>

          {scheduleList.length === 0 ? (
            <div className="py-10 text-center text-gray-600">No assigned offerings yet.</div>
          ) : (
            <div className="space-y-4">
              {scheduleList.slice(0, 6).map((r) => {
                const published = r.is_published === true;
                const active = r.session_active === true;

                return (
                  <div
                    key={r.course_offering_id}
                    className="flex items-start gap-4 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 transition-colors hover:border-purple-200"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-600">
                      <Clock className="h-6 w-6 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-semibold text-gray-900">
                          {r.course_code} — {r.course_title}
                        </h4>

                        {active ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeClass('green')}`}>
                            Active session
                          </span>
                        ) : null}

                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeClass(published ? 'green' : 'gray')}`}>
                          {published ? 'Published' : 'Unpublished'}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>{r.session_name}</span>
                        <span className="capitalize">{r.semester} semester</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {r.eligible_students} eligible
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/academic_staff/results/${r.course_offering_id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-white"
                    >
                      Open <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grade Submission Queue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 overflow-hidden">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
            <ClipboardCheck className="h-5 w-5 text-purple-600" />
            Grade Submission
          </h3>

          {gradeQueue.length === 0 ? (
            <div className="py-10 text-center text-gray-600">Nothing in your queue yet.</div>
          ) : (
            <div className="space-y-4">
              {gradeQueue.map((item) => {
                const complete = item.pending_results <= 0;

                return (
                  <div
                    key={item.course_offering_id}
                    className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {item.course_code} — {item.course_title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.session_name} • <span className="capitalize">{item.semester} Semester</span>
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                          complete ? badgeClass('green') : badgeClass('orange')
                        }`}
                      >
                        {complete ? 'Complete' : `${item.pending_results} pending`}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-600">
                        {complete ? 'All eligible results submitted' : 'Needs submission'}
                      </p>

                      <Link
                        href={`/dashboard/academic_staff/results/${item.course_offering_id}`}
                        className="text-sm font-medium text-purple-700 hover:text-purple-800"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/dashboard/academic_staff/courses"
            className="mt-4 block w-full rounded-lg py-2 text-center text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
          >
            Go to My Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
