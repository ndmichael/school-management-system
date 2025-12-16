import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
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
  course_session_id: string | null;
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
  for (const f of filters) {
    if (f.op === "eq") q = q.eq(f.col, f.value);
  }
  const { count, error } = await q;
  if (error) return null; // table missing / RLS / etc → don’t crash the dashboard
  return count ?? 0;
}

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  // Auth guard is already done in your layout, but we still need user id here
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) {
    // If your layout already redirects, you might never hit this.
    return null;
  }

  const [{ data: profile }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, first_name, middle_name, last_name, email, phone, avatar_url, address, state_of_origin, lga_of_origin, updated_at"
      )
      .eq("id", user.id)
      .single<ProfileRow>(),
    supabase
      .from("students")
      .select(
        "id, profile_id, matric_no, level, cgpa, status, program_id, department_id, course_session_id"
      )
      .eq("profile_id", user.id)
      .single<StudentRow>(),
  ]);

  if (!profile || !student) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-xl font-semibold text-gray-900">Student Dashboard</h1>
        <p className="text-sm text-gray-600 mt-2">
          Your student record is not complete yet (profile/student row missing).
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700"
          >
            Complete Profile
          </Link>
        </div>
      </div>
    );
  }

  const name = fullName(profile);
  const avatar = profile.avatar_url || dicebearFallback(name);

  // Live payment receipt counts (you definitely have this table)
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

  // Optional: only shows if your tables exist + RLS allows reading
  const [materialsCount, resultsCount] = await Promise.all([
    safeCount(supabase, "course_materials", [
      // these filters are best-effort; change to match your schema
      ...(student.program_id ? [{ col: "program_id", op: "eq" as const, value: student.program_id }] : []),
      ...(student.department_id ? [{ col: "department_id", op: "eq" as const, value: student.department_id }] : []),
      ...(student.course_session_id ? [{ col: "course_session_id", op: "eq" as const, value: student.course_session_id }] : []),
    ]),
    safeCount(supabase, "results", [{ col: "student_id", op: "eq", value: student.id }]),
  ]);

  const profileMissing = [
    profile.phone ? null : "phone",
    profile.address ? null : "address",
    profile.state_of_origin ? null : "state_of_origin",
    profile.lga_of_origin ? null : "lga_of_origin",
  ].filter((x): x is string => Boolean(x));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12">
            <Image src={avatar} alt={name} fill className="rounded-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {name}</h1>
            <p className="text-sm text-gray-600">
              Matric: <span className="font-mono text-gray-900">{student.matric_no ?? "—"}</span>
              {" · "}
              Level: <span className="text-gray-900">{student.level ?? "—"}</span>
              {" · "}
              Status: <span className="text-gray-900">{student.status ?? "—"}</span>
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/student/profile"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700"
        >
          Update Profile
        </Link>
      </div>

      {/* Profile completeness */}
      {profileMissing.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            Your profile is incomplete. Missing:{" "}
            <span className="font-medium">{profileMissing.join(", ")}</span>
          </p>
          <p className="text-xs text-blue-800 mt-1">
            Complete it to avoid issues with verification and processing.
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="CGPA" value={student.cgpa ?? "—"} />
        <StatCard label="Pending Receipts" value={pendingReceipts ?? "—"} accent />
        <StatCard label="Materials" value={materialsCount ?? "—"} />
        <StatCard label="Results" value={resultsCount ?? "—"} />
      </div>

      {/* Payments status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <MiniCard title="Payments" subtitle="Upload receipts for validation" href="/dashboard/payments" />
        <MiniStat title="Approved" value={approvedReceipts ?? "—"} />
        <MiniStat title="Rejected" value={rejectedReceipts ?? "—"} />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="Submit Payment Receipt"
          desc="Upload proof of payment and track approval."
          href="/dashboard/student/payments"
        />
        <ActionCard
          title="Download Materials"
          desc="Get course handouts, slides, and PDFs."
          href="/dashboard/student/downloads"
        />
        <ActionCard
          title="View Results"
          desc="Check published results and grades."
          href="/dashboard/student/results"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-blue-700" : "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}

function ActionCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-blue-200 hover:shadow-sm transition"
    >
      <div className="text-base font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{desc}</div>
      <div className="mt-3 text-sm font-medium text-blue-700">Open →</div>
    </Link>
  );
}

function MiniCard({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-blue-200 hover:shadow-sm transition"
    >
      <div className="text-base font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{subtitle}</div>
      <div className="mt-3 text-sm font-medium text-blue-700">Go →</div>
    </Link>
  );
}

function MiniStat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
