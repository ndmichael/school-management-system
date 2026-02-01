import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  GraduationCap,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Upload,
  BarChart3,
  AlertCircle,
  ArrowRight,
  User,
} from "lucide-react";

type StoredFile = { bucket: string; path: string };

type ProfileRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_file: StoredFile | null;
  address: string | null;
  state_of_origin: string | null;
  lga_of_origin: string | null;
  updated_at: string | null;
};

type StudentRow = {
  id: string;
  profile_id: string;
  matric_no: string | null;
  level: string | null;
  cgpa: number | null;
  status: string | null;
  program_id: string | null;
  department_id: string | null;
  admission_session_id: string | null;
};

type CourseOfferingRow = {
  id: string;
  session_id: string | null;
  semester: "first" | "second" | string | null;
  level: string | null;
  program_id: string | null;
  is_published?: boolean | null;
  course: {
    id: string;
    code: string;
    title: string;
    credits: number;
  } | null;
};

function fullName(p: ProfileRow | null): string {
  const parts = [p?.first_name, p?.middle_name, p?.last_name].filter(
    (v): v is string => Boolean(v)
  );
  return parts.length ? parts.join(" ") : "Student";
}

function dicebearFallback(seed: string): string {
  const safe = encodeURIComponent(seed || "Student");
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${safe}&backgroundColor=b6e3f4`;
}

async function safeCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  filters: Array<{ col: string; op: "eq"; value: string }>
): Promise<number | null> {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  for (const f of filters) q = q.eq(f.col, f.value);
  const { count, error } = await q;
  if (error) return null;
  return count ?? 0;
}

function semesterLabel(s: string | null | undefined) {
  if (s === "first") return "First Semester";
  if (s === "second") return "Second Semester";
  return s ?? "—";
}

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const [{ data: profile }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, first_name, middle_name, last_name, email, phone, avatar_file, address, state_of_origin, lga_of_origin, updated_at"
      )
      .eq("id", user.id)
      .single<ProfileRow>(),
    supabase
      .from("students")
      .select(
        "id, profile_id, matric_no, level, cgpa, status, program_id, department_id, admission_session_id"
      )
      .eq("profile_id", user.id)
      .single<StudentRow>(),
  ]);

  if (!profile || !student) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50/50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
            <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-white p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-blue-50">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Student Dashboard
                  </h1>
                  <p className="text-sm text-slate-600">
                    Profile setup required
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600">
                Your student record is not complete yet. Please complete your
                profile to access the dashboard.
              </p>

              <Link
                href="/dashboard/student/profile"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                <User className="h-4 w-4 transition-transform group-hover:scale-110" />
                Update Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const name = fullName(profile);

  const avatar = (() => {
    const fallback = dicebearFallback(name);
    const f = profile.avatar_file;
    if (!f?.bucket || !f?.path) return fallback;
    const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path);
    return data?.publicUrl || fallback;
  })();

  const [pendingReceipts, approvedReceipts, rejectedReceipts] = await Promise.all([
    safeCount(supabase, "payment_receipts", [
      { col: "student_id", op: "eq", value: student.id },
      { col: "status", op: "eq", value: "pending" },
    ]),
    safeCount(supabase, "payment_receipts", [
      { col: "student_id", op: "eq", value: student.id },
      { col: "status", op: "eq", value: "approved" },
    ]),
    safeCount(supabase, "payment_receipts", [
      { col: "student_id", op: "eq", value: student.id },
      { col: "status", op: "eq", value: "rejected" },
    ]),
  ]);

  // 1️⃣ Get course offering IDs allowed for student's program
  const { data: programLinks, error: linkErr } = await supabase
    .from("course_offering_programs")
    .select("course_offering_id")
    .eq("program_id", student.program_id);

  if (linkErr) {
    throw linkErr;
  }

  const allowedOfferingIds = (programLinks ?? []).map(
    (r) => r.course_offering_id
  );

  // 2️⃣ Fetch offerings (NO duplicates, M2M-correct)
  const { data: courseOfferings, error: offErr } = await supabase
    .from("course_offerings")
    .select(
      `
      id,
      session_id,
      semester,
      level,
      is_published,
      course:courses (
        id,
        code,
        title,
        credits
      )
      `
    )
    .eq("is_published", true)
    .eq("session_id", student.admission_session_id)
    .in("id", allowedOfferingIds)
    .order("created_at", { ascending: false })
    .limit(4)
    .returns<CourseOfferingRow[]>();

  const offerings = offErr ? null : courseOfferings ?? [];


  const profileMissing = [
    profile.phone ? null : "phone",
    profile.address ? null : "address",
    profile.state_of_origin ? null : "state_of_origin",
    profile.lga_of_origin ? null : "lga_of_origin",
  ].filter((x): x is string => Boolean(x));

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <Image
                src={avatar}
                alt={name}
                fill
                className="rounded-2xl object-cover shadow-lg ring-2 ring-slate-100"
              />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-green-500 shadow-sm" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Welcome, {name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-mono text-slate-900">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {student.matric_no ?? "—"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700">
                  Level {student.level ?? "—"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                    student.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {student.status ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/student/profile"
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <User className="h-4 w-4 transition-transform group-hover:scale-110" />
            Update Profile
          </Link>
        </div>

        {profileMissing.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50 to-yellow-50 p-5 shadow-lg">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-700" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-amber-900">Profile Incomplete</p>
                <p className="text-sm text-amber-800">
                  Missing fields:{" "}
                  <span className="font-medium">{profileMissing.join(", ")}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Current CGPA"
            value={student.cgpa?.toFixed(2) ?? "—"}
            icon={<BarChart3 className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            label="Pending Receipts"
            value={pendingReceipts ?? "—"}
            icon={<Clock className="h-6 w-6" />}
            color="amber"
            href="/dashboard/student/payments"
          />
          <StatCard
            label="Approved Receipts"
            value={approvedReceipts ?? "—"}
            icon={<CheckCircle2 className="h-6 w-6" />}
            color="green"
          />
          <StatCard
            label="Rejected Receipts"
            value={rejectedReceipts ?? "—"}
            icon={<XCircle className="h-6 w-6" />}
            color="red"
          />
        </div>

        {/* Course Offerings */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
          <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-purple-100 to-purple-50">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Course Offerings</h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Published courses for your session, program, and level
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/student/courses"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View all
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="p-6">
            {offerings === null ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <AlertCircle className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">Unable to load courses</p>
              </div>
            ) : offerings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <BookOpen className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">No courses published yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offerings.map((o) => (
                  <div
                    key={o.id}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md hover:shadow-slate-100/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">
                        <span className="font-mono text-blue-600">{o.course?.code ?? "—"}</span>
                        {" · "}
                        {o.course?.title ?? "Untitled Course"}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">
                          {semesterLabel(o.semester)}
                        </span>
                        <span>•</span>
                        <span>{o.course?.credits ?? "—"} Credits</span>
                        <span>•</span>
                        <span>Level {o.level ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            title="Submit Payment Receipt"
            desc="Upload proof of payment for verification and approval"
            href="/dashboard/student/payments"
            icon={<Upload className="h-6 w-6" />}
            color="blue"
          />
          <ActionCard
            title="View Results"
            desc="Check your published examination results and grades"
            href="/dashboard/student/results"
            icon={<FileText className="h-6 w-6" />}
            color="green"
          />
          <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-linear-to-br from-slate-50 to-white p-6 shadow-xl shadow-slate-100/50">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-slate-200 to-slate-100">
                <BarChart3 className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Results Status</h3>
                <p className="mt-1 text-sm text-slate-600">Results not yet available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="grid gap-5 lg:grid-cols-3">
          <MiniCard
            title="Payment Portal"
            subtitle="Upload and track your payment receipts"
            href="/dashboard/student/payments"
            icon={<Upload className="h-5 w-5" />}
          />
          <MiniStat
            title="Approved Payments"
            value={approvedReceipts ?? "—"}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="green"
          />
          <MiniStat
            title="Rejected Payments"
            value={rejectedReceipts ?? "—"}
            icon={<XCircle className="h-5 w-5" />}
            color="red"
          />
        </div>
      </div>
    </div>
  );
}

/* --- components below unchanged --- */

function StatCard({
  label,
  value,
  icon,
  color = "slate",
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "blue" | "amber" | "green" | "red" | "slate";
  href?: string;
}) {
  const colorClasses = {
    blue: "from-blue-100 to-blue-50 text-blue-600 group-hover:from-blue-600 group-hover:to-blue-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/25",
    amber: "from-amber-100 to-amber-50 text-amber-600 group-hover:from-amber-600 group-hover:to-amber-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-amber-500/25",
    green: "from-green-100 to-green-50 text-green-600 group-hover:from-green-600 group-hover:to-green-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-green-500/25",
    red: "from-red-100 to-red-50 text-red-600 group-hover:from-red-600 group-hover:to-red-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-500/25",
    slate: "from-slate-100 to-slate-50 text-slate-600 group-hover:from-slate-700 group-hover:to-slate-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-slate-500/25",
  };

  const card = (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-linear-to-br from-slate-50 via-white to-white p-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-100/50 hover:border-slate-300">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br transition-all duration-300 group-hover:scale-110 ${colorClasses[color]}`}
          >
            {icon}
          </div>
          {href && (
            <ArrowRight className="h-5 w-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600 mb-1.5">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="block focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 rounded-3xl"
    >
      {card}
    </Link>
  ) : (
    card
  );
}

function ActionCard({
  title,
  desc,
  href,
  icon,
  color = "blue",
}: {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  color?: "blue" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "from-blue-100 to-blue-50 text-blue-600",
    green: "from-green-100 to-green-50 text-green-600",
    purple: "from-purple-100 to-purple-50 text-purple-600",
  };

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-100/50 transition-all hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-100/50 hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br transition-transform group-hover:scale-110 ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 group-hover:text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
        Open
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function MiniCard({
  title,
  subtitle,
  href,
  icon,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-100/50 transition-all hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-100/50 hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-100 to-blue-50 text-blue-600 transition-transform group-hover:scale-110">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
        Go
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function MiniStat({
  title,
  value,
  icon,
  color = "slate",
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "green" | "red" | "slate";
}) {
  const colorClasses = {
    green: "from-green-100 to-green-50 text-green-600",
    red: "from-red-100 to-red-50 text-red-600",
    slate: "from-slate-100 to-slate-50 text-slate-600",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-100/50">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

