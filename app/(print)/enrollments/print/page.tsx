// app/dashboard/student/enrollments/print/page.tsx
import { createClient } from "@/lib/supabase/server";

type PrintRow = {
  session_name: string | null;
  level: string | null;
  course_offering_id: string;
  course_code: string | null;
  course_title: string | null;
  credits: number | null;
  enrolled_at: string | null;
};

type TotalsRow = {
  total_courses: number | null;
  total_credits: number | null;
};

function semesterLabel(s: string | null): string {
  if (s === "first") return "First Semester";
  if (s === "second") return "Second Semester";
  return s ?? "—";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default async function EnrollmentPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; semester?: string }>;
}) {
  const { session_id, semester } = await searchParams;
  const sessionId = (session_id ?? "").trim();
  const sem = (semester ?? "").trim();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: student } = await supabase
    .from("students")
    .select("id, matric_no, program:programs(name), department:departments(name)")
    .eq("profile_id", auth.user.id)
    .single<{
      id: string;
      matric_no: string | null;
      program: { name: string } | null;
      department: { name: string } | null;
    }>();

  if (!student?.id || !sessionId || !sem) {
    return <div className="p-8 text-center">Invalid print request.</div>;
  }

  const { data: rows } = await supabase
    .from("v_student_enrolled_course_offerings")
    .select(
      "session_name, level, course_offering_id, course_code, course_title, credits, enrolled_at"
    )
    .eq("student_id", student.id)
    .eq("session_id", sessionId)
    .eq("semester", sem)
    .order("course_code", { ascending: true })
    .returns<PrintRow[]>();

  const { data: totals } = await supabase
    .from("v_student_enrollment_totals")
    .select("total_courses, total_credits")
    .eq("student_id", student.id)
    .eq("session_id", sessionId)
    .eq("semester", sem)
    .maybeSingle<TotalsRow>();

  const list = rows ?? [];
  const headerSession = list[0]?.session_name ?? "Academic Session";
  const level = list[0]?.level ?? "—";

  return (
    <div className="mx-auto max-w-4xl p-8 text-slate-900">
      {/* PRINT + PAGE STYLES */}
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }

        .signature-block {
        page-break-inside: avoid;
        }
        th, td { border: 1px solid #cbd5f5; padding: 10px; }
        th { background: #f1f5f9; font-size: 12px; text-align: left; }
        td { font-size: 13px; }
      `}</style>

      {/* AUTO PRINT – SERVER SAFE */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.onload = () => {
              setTimeout(() => window.print(), 300);
            };
          `,
        }}
      />

      {/* OFFICIAL HEADER */}
      <div className="mb-6 border-b pb-4 text-center">
        <div className="text-lg font-extrabold uppercase">
          SYK Health Technology University
        </div>
        <div className="text-sm font-semibold uppercase">
          {student.program?.name ?? "Programme"} ·{" "}
          {student.department?.name ?? "Department"}
        </div>
        <div className="mt-1 text-sm text-slate-600">
          {headerSession} — {semesterLabel(sem)}
        </div>
      </div>

      {/* STUDENT INFO */}
      <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="font-semibold">Matric No</div>
          <div>{student.matric_no ?? "—"}</div>
        </div>
        <div>
          <div className="font-semibold">Level</div>
          <div>{level}</div>
        </div>
        <div>
          <div className="font-semibold">Printed At</div>
          <div>{new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* COURSES */}
      <table className="mt-4">
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Title</th>
            <th>Credits</th>
            <th>Enrolled At</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4}>No enrolled courses.</td>
            </tr>
          ) : (
            list.map((r) => (
              <tr key={r.course_offering_id}>
                <td className="font-mono">{r.course_code ?? "—"}</td>
                <td>{r.course_title ?? "—"}</td>
                <td>{r.credits ?? 0}</td>
                <td>{formatDate(r.enrolled_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* TOTALS */}
      <div className="mt-4 text-sm font-semibold">
        Total Courses: {totals?.total_courses ?? list.length} · Total Credits:{" "}
        {totals?.total_credits ?? 0}
      </div>

      {/* SIGNATURES */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
        <div>
          <div className="font-semibold">Student</div>
          <div className="mt-10 border-t pt-2">Signature / Date</div>
        </div>
        <div>
          <div className="font-semibold">Registry</div>
          <div className="mt-10 border-t pt-2">Signature / Stamp</div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        This document is system-generated and valid only for the stated session and semester.
      </div>
    </div>
  );
}