// app/dashboard/student/enrollments/print/page.tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

type PrintRow = {
  student_id: string;
  matric_no: string | null;
  session_id: string;
  session_name: string | null;
  semester: string | null;
  level: string | null;
  course_offering_id: string;
  course_code: string | null;
  course_title: string | null;
  credits: number | null;
  enrolled_at: string | null;
};

type TotalsRow = {
  student_id: string;
  session_id: string;
  semester: string | null;
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
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
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
    .select("id, matric_no")
    .eq("profile_id", auth.user.id)
    .single<{ id: string; matric_no: string | null }>();

  if (!student?.id || !sessionId || !sem) {
    return <div className="p-8 text-center">Invalid print request.</div>;
  }

  const { data: rows } = await supabase
    .from("v_student_enrolled_course_offerings")
    .select(
      "student_id, matric_no, session_id, session_name, semester, level, course_offering_id, course_code, course_title, credits, enrolled_at"
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
  const printedAt = new Date().toLocaleString();

  const totalCourses = totals?.total_courses ?? list.length;
  const totalCredits =
    totals?.total_credits ??
    list.reduce((sum, r) => sum + (r.credits ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl p-8 text-slate-900">
      {/* Print styles */}
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5f5; padding: 10px; }
        th { background: #f1f5f9; text-align: left; font-size: 12px; }
        td { font-size: 13px; }
      `}</style>

      {/* Print button */}
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Header with logo */}
      <div className="mb-6 flex items-center gap-4 border-b pb-4">
        <img
            src="/brand/logo.png"
            alt="SYK Health Tech"
            style={{
                height: "72px",
                width: "auto",
                objectFit: "contain",
                display: "block",
            }}
        />

        <div>
          <h1 className="text-xl font-extrabold uppercase">
            Course Enrollment Slip
          </h1>
          <div className="text-sm text-slate-600">
            {headerSession} · {semesterLabel(sem)}
          </div>
        </div>
      </div>

      {/* Student info */}
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
          <div>{printedAt}</div>
        </div>
      </div>

      {/* Courses table */}
      <table className="mt-4">
        <thead>
          <tr>
            <th style={{ width: "20%" }}>Course Code</th>
            <th>Course Title</th>
            <th style={{ width: "10%" }}>Credits</th>
            <th style={{ width: "25%" }}>Enrolled At</th>
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

      {/* Totals */}
      <div className="mt-4 flex gap-6 text-sm font-semibold">
        <div>Total Courses: {totalCourses}</div>
        <div>Total Credits: {totalCredits}</div>
      </div>

      {/* Signatures */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
        <div>
          <div className="font-semibold">Student</div>
          <div className="mt-10 border-t pt-2">Signature / Date</div>
        </div>
        <div>
          <div className="font-semibold">Department / Registry</div>
          <div className="mt-10 border-t pt-2">Signature / Stamp</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-slate-500">
        This document is system-generated and valid only for the stated session and semester.
      </div>
    </div>
  );
}