'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, BookOpen, Users, CheckCircle2, AlertTriangle } from 'lucide-react';

type Semester = 'first' | 'second';

type Course = { code: string; title: string; credits: number };
type Session = { name: string; is_active: boolean | null };

type CourseOfferingRow = {
  id: string;
  semester: Semester | string;
  is_published: boolean | null;
  course_id: string;
  session_id: string;
  program_id: string | null;
  level: string | null;

  // joins can come back as object or array (depends on relationship)
  courses: Course | Course[] | null;
  sessions: Session | Session[] | null;
};

type CourseOfferingDetails = {
  id: string;
  semester: Semester | string;
  is_published: boolean | null;
  course_id: string;
  session_id: string;
  program_id: string | null;
  level: string | null;
  course: Course;
  session: Session;
};

type StudentProfile = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
};

type RegistrationRow = {
  session_id: string;
  level: string | null;
  status: string;
};

type StudentRowRaw = {
  id: string;
  matric_no: string;
  program_id: string | null;
  profile_id: string;

  // IMPORTANT: supabase join can be object OR array OR null
  profile: StudentProfile | StudentProfile[] | null;
  registrations: RegistrationRow[];
};

type Student = {
  id: string;
  matric_no: string;
  level: string | null;
  program_id: string | null;
  profile_id: string;
  profile: StudentProfile;
};

type ResultRow = { student_profile_id: string };

type PageRow = {
  student: Student;
  has_result: boolean;
};

const supabase = createClient();

function isPromise<T>(v: unknown): v is Promise<T> {
  return (
    typeof v === 'object' &&
    v !== null &&
    'then' in v &&
    typeof (v as { then?: unknown }).then === 'function'
  );
}

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function clampPct(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function isStudentProfile(v: unknown): v is StudentProfile {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.first_name === 'string' &&
    typeof o.last_name === 'string' &&
    (o.middle_name === null || typeof o.middle_name === 'string')
  );
}

function firstProfile(v: StudentProfile | StudentProfile[] | null): StudentProfile | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function isStudentRowRaw(v: unknown): v is StudentRowRaw {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;

  const prof = o.profile;
  const profileOk =
    prof === null ||
    isStudentProfile(prof) ||
    (Array.isArray(prof) && (prof.length === 0 || isStudentProfile(prof[0])));

  return (
    typeof o.id === 'string' &&
    typeof o.matric_no === 'string' &&
    (o.level === null || typeof o.level === 'string') &&
    (o.program_id === null || typeof o.program_id === 'string') &&
    typeof o.profile_id === 'string' &&
    profileOk
  );
}

function fullName(p: StudentProfile): string {
  const mid = p.middle_name?.trim();
  return [p.first_name, mid && mid.length > 0 ? mid : null, p.last_name]
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(' ');
}

export default function AcademicStaffOfferingResultsPage({
  params,
}: {
  params: Promise<{ offeringId: string }> | { offeringId: string };
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [offering, setOffering] = useState<CourseOfferingDetails | null>(null);
  const [rows, setRows] = useState<PageRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const resolved = isPromise<{ offeringId: string }>(params) ? await params : params;
        const offeringId = resolved.offeringId;

        if (!offeringId || offeringId.length < 10) {
          throw new Error('Invalid offering id.');
        }

        // auth.user.id === profiles.id in your schema
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr || !auth.user?.id) throw new Error('Not authenticated.');
        const profileId = auth.user.id;

        // Must be assigned
        const { data: assignment, error: assignErr } = await supabase
          .from('course_offering_staff')
          .select('id')
          .eq('course_offering_id', offeringId)
          .eq('staff_id', profileId)
          .maybeSingle();

        if (assignErr) throw new Error(assignErr.message);
        if (!assignment) throw new Error('You are not assigned to this course offering.');

        // Offering details
        const { data: offRaw, error: offErr } = await supabase
          .from('course_offerings')
          .select(
            `
            id,
            semester,
            is_published,
            course_id,
            session_id,
            program_id,
            level,
            courses ( code, title, credits ),
            sessions ( name, is_active )
          `
          )
          .eq('id', offeringId)
          .single();

        if (offErr) throw new Error(offErr.message);
        if (!offRaw) throw new Error('Course offering not found.');

        const off = offRaw as unknown as CourseOfferingRow;

        const course = firstOf(off.courses);
        const session = firstOf(off.sessions);

        if (!course) {
          throw new Error(
            'Failed to load course details for this offering. (Check course_offerings.course_id FK data)'
          );
        }
        if (!session) {
          throw new Error(
            'Failed to load session details for this offering. (Check course_offerings.session_id FK data)'
          );
        }

        const offeringDetails: CourseOfferingDetails = {
          id: off.id,
          semester: off.semester,
          is_published: off.is_published,
          course_id: off.course_id,
          session_id: off.session_id,
          program_id: off.program_id,
          level: off.level,
          course,
          session,
        };

        // Eligible students (via student_registrations for the offering session)
        let studentsQuery = supabase
          .from("students")
          .select(
            `
            id,
            matric_no,
            program_id,
            profile_id,
            profile:profiles!students_profile_id_fkey ( first_name, middle_name, last_name ),
            registrations:student_registrations!inner ( session_id, level, status )
          `
          )
          .eq("status", "active")
          .eq("registrations.session_id", offeringDetails.session_id)
          .order("matric_no", { ascending: true });

        // scope by program
        if (offeringDetails.program_id) {
          studentsQuery = studentsQuery.eq("program_id", offeringDetails.program_id);
        }

        // scope by level (use registrations.level, not students.level)
        if (offeringDetails.level) {
          studentsQuery = studentsQuery.eq("registrations.level", offeringDetails.level);
        }

        const { data: studentsRaw, error: stErr } = await studentsQuery;
        if (stErr) throw new Error(stErr.message);


        const students: Student[] = (Array.isArray(studentsRaw) ? studentsRaw : [])
          .filter(isStudentRowRaw)
          .map((s) => {
            const profile = firstProfile(s.profile);
            if (!profile) return null;

            return {
              id: s.id,
              matric_no: s.matric_no,
              level: s.registrations[0]?.level ?? null,
              program_id: s.program_id,
              profile_id: s.profile_id,
              profile,
            } satisfies Student;
          })
          .filter((x): x is Student => x !== null);

        // Submitted results
        const { data: resultsRaw, error: resErr } = await supabase
          .from('results')
          .select('student_profile_id')
          .eq('course_offering_id', offeringId);

        if (resErr) throw new Error(resErr.message);

        const submittedSet = new Set<string>(
          (Array.isArray(resultsRaw) ? (resultsRaw as ResultRow[]) : []).map((r) => r.student_profile_id)
        );

        const pageRows: PageRow[] = students.map((s) => ({
          student: s,
          has_result: submittedSet.has(s.profile_id),
        }));

        if (cancelled) return;
        setOffering(offeringDetails);
        setRows(pageRows);
      } catch (e) {
        console.error(e);
        if (cancelled) return;

        setOffering(null);
        setRows([]);
        setError(e instanceof Error ? e.message : 'Failed to load grade sheet.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [params]);

  const stats = useMemo(() => {
    const total = rows.length;
    const submitted = rows.filter((r) => r.has_result).length;
    const pending = total - submitted;
    const pct = total <= 0 ? 0 : clampPct(Math.round((submitted / total) * 100));
    return { total, submitted, pending, pct };
  }, [rows]);

  if (loading) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900">Loading grade sheet…</p>
            <p className="mt-1 text-xs text-gray-500">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !offering) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-700" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Failed to load grade sheet</p>
                <p className="mt-1 text-sm text-gray-700">{error ?? 'Unknown error'}</p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/dashboard/academic_staff/courses"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to My Courses
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        {/* Top actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboard/academic_staff/courses"
            className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to My Courses
          </Link>

          <Link
            href="/dashboard/academic_staff/courses"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Go to Courses
          </Link>
        </div>

        {/* Header */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-linear-to-r from-purple-50 via-white to-white p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100/70 ring-1 ring-purple-200">
                    <BookOpen className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                      {offering.course.code} — {offering.course.title}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">{offering.session.name}</span>
                      <span>•</span>
                      <span className="capitalize">{String(offering.semester)} semester</span>
                      <span>•</span>
                      <span>{offering.course.credits} credits</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Badge tone="purple" label={`Students: ${stats.total}`} icon={<Users className="h-4 w-4" />} />
                  <Badge tone="emerald" label={`Submitted: ${stats.submitted}`} />
                  <Badge tone="orange" label={`Pending: ${stats.pending}`} />
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:min-w-[260px]">
                  <p className="text-xs font-semibold text-gray-600">Completion</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stats.pct}%</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
                    <div className="h-full bg-purple-600" style={{ width: `${stats.pct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {stats.submitted} submitted • {stats.pending} pending
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Students list */}
        {rows.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-base font-semibold text-gray-900">No eligible students found</p>
            <p className="mt-1 text-sm text-gray-600">
              This offering scope (session/program/level) may not match any active students.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <Th>Matric No</Th>
                    <Th>Student</Th>
                    <Th>Level</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r.student.profile_id} className="hover:bg-gray-50/70">
                      <td className="px-6 py-4 font-mono text-sm text-gray-900">{r.student.matric_no}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{fullName(r.student.profile)}</div>
                        <div className="text-xs text-gray-600">Profile: {r.student.profile_id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.student.level ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={[
                            'inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold ring-1',
                            r.has_result
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-gray-100 text-gray-700 ring-gray-200',
                          ].join(' ')}
                        >
                          {r.has_result ? 'Submitted' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-xs text-gray-600">
              “Pending” means no result exists yet for that student in this offering.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">{children}</th>;
}

function Badge({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: 'purple' | 'emerald' | 'orange';
  icon?: React.ReactNode;
}) {
  const cls =
    tone === 'purple'
      ? 'bg-purple-50 text-purple-700 ring-purple-200'
      : tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-orange-50 text-orange-700 ring-orange-200';

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ${cls}`}>
      {icon ? <span className="text-current">{icon}</span> : null}
      {label}
    </span>
  );
}
