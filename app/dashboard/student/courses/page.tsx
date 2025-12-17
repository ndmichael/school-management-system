// app/dashboard/student/courses/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";

type StudentRow = {
  id: string;
  program_id: string | null;
  // ✅ removed department_id (not needed for offerings in your schema)
  level: string | null;
  course_session_id: string | null;
};

type SessionRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean | null;
};

type CourseRow = {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: string;
};

type OfferingRow = {
  id: string;
  course_id: string;
  session_id: string;
  semester: string | null;
  level: string | null;
  program_id: string | null;
  // ✅ removed department_id (your table does not have it)
  is_published?: boolean | null;
  courses?: CourseRow | CourseRow[] | null;
  sessions?: Pick<SessionRow, "id" | "name" | "start_date" | "end_date"> | any;
};

function asOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function semesterLabel(s: string | null | undefined) {
  if (s === "first") return "First Semester";
  if (s === "second") return "Second Semester";
  return s ?? "—";
}

export default async function StudentCoursesPage({
  searchParams,
}: {
  searchParams?: { session?: string; semester?: string; q?: string };
}) {
  const supabase = await createClient();

  const { data: userRes, error: uErr } = await supabase.auth.getUser();
  const user = userRes.user;

  if (uErr || !user) return null;

  // 1) student row (used for scoping offerings)
  const { data: student, error: sErr } = await supabase
    .from("students")
    .select("id, program_id, level, course_session_id")
    .eq("profile_id", user.id)
    .single<StudentRow>();

  if (sErr || !student) {
    return (
      <div className="space-y-4">
        {/* ✅ Back button */}
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h1 className="text-xl font-semibold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-600 mt-2">
            Your student record is not complete yet (students row missing).
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/student/profile"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2) sessions for filter dropdown (best-effort)
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, start_date, end_date, is_active")
    .order("start_date", { ascending: false })
    .limit(30)
    .returns<SessionRow[]>();

  const activeSession = sessions?.find((x) => x.is_active) ?? null;

  const sessionFilter =
    searchParams?.session?.trim() ||
    student.course_session_id ||
    activeSession?.id ||
    "";

  const semesterFilter = (searchParams?.semester ?? "").trim();
  const q = (searchParams?.q ?? "").trim();

  // 3) load offerings (published only)
  let offerings: OfferingRow[] = [];
  let loadError: string | null = null;

  try {
    let query = supabase
      .from("course_offerings")
      .select(
        `
          id,
          course_id,
          session_id,
          semester,
          level,
          program_id,
          is_published,
          courses:course_id ( id, code, title, credits, semester ),
          sessions:session_id ( id, name, start_date, end_date )
        `
      )
      .eq("is_published", true);

    // Scope by student's program/level.
    // Shared offerings can be stored with program_id/level = NULL.
    if (student.program_id) {
      query = query.or(`program_id.eq.${student.program_id},program_id.is.null`);
    } else {
      query = query.is("program_id", null);
    }

    if (student.level) {
      query = query.or(`level.eq.${student.level},level.is.null`);
    } else {
      query = query.is("level", null);
    }

    if (sessionFilter) query = query.eq("session_id", sessionFilter);
    if (semesterFilter) query = query.eq("semester", semesterFilter);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .returns<OfferingRow[]>();

    if (error) throw new Error(error.message);
    offerings = data ?? [];

    // client-side search (MVP safe)
    if (q) {
      const qq = q.toLowerCase();
      offerings = offerings.filter((o) => {
        const c = asOne<CourseRow>(o.courses as any);
        const code = (c?.code ?? "").toLowerCase();
        const title = (c?.title ?? "").toLowerCase();
        return code.includes(qq) || title.includes(qq);
      });
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load course offerings";
    offerings = [];
  }

  return (
    <div className="space-y-6">
      {/* ✅ Back button */}
      <div>
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-xs text-gray-500 mt-1">
            Published course offerings for your program/level.
          </p>
        </div>
      </div>

      {/* Filters */}
      <form className="bg-white border border-gray-200 rounded-2xl p-4 grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Session</label>
          <select
            name="session"
            defaultValue={sessionFilter}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
          >
            <option value="">All / Not set</option>
            {(sessions ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Semester</label>
          <select
            name="semester"
            defaultValue={semesterFilter}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white"
          >
            <option value="">All</option>
            <option value="first">First Semester</option>
            <option value="second">Second Semester</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="e.g. HTH 101 or Anatomy"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl"
          />
        </div>

        <div className="md:col-span-3 flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Apply
          </button>
          <Link
            href="/dashboard/student/courses"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
          >
            Reset
          </Link>
        </div>
      </form>

      {/* Errors / Empty state */}
      {loadError ? (
        <div className="bg-white border border-red-200 rounded-2xl p-6">
          <div className="text-sm font-semibold text-red-700">Could not load course offerings</div>
          <div className="text-sm text-red-600 mt-1">{loadError}</div>
          <div className="text-xs text-gray-500 mt-3">
            If you haven’t created/published offerings yet, this is expected.
          </div>
        </div>
      ) : offerings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-sm font-semibold text-gray-900">Not published yet</div>
          <div className="text-sm text-gray-600 mt-1">
            Course offerings for your program/session haven’t been published.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offerings.map((o) => {
            const course = asOne<CourseRow>(o.courses as any);
            const sess = asOne<any>(o.sessions as any);

            return (
              <div key={o.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">{course?.code ?? "—"}</div>
                    <div className="text-lg font-semibold text-gray-900">{course?.title ?? "Course"}</div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
                    {semesterLabel(o.semester ?? course?.semester ?? null)}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <div>
                    <span className="font-medium">Credits:</span> {course?.credits ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Level:</span> {o.level ?? student.level ?? "—"}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Session:</span> {sess?.name ?? "—"}
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Offered for your program/level (shared courses may appear too).
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
