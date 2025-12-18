"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { BookOpen } from "lucide-react";

type Semester = "first" | "second";

type Course = { id: string; code: string; title: string };
type Session = { id: string; name: string };
type Program = { id: string; name: string };

type Props = {
  courses: Course[];
  sessions: Session[];
  programs: Program[];
};

type ApiOk = { id: string };
type ApiErr = { error: string };

function isApiErr(v: unknown): v is ApiErr {
  return typeof v === "object" && v !== null && "error" in v && typeof (v as { error?: unknown }).error === "string";
}

export default function CreateOfferingForm({ courses, sessions, programs }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [semester, setSemester] = useState<Semester | "">("");
  const [programId, setProgramId] = useState<string>(""); // empty => null
  const [level, setLevel] = useState<string>(""); // empty => null

  const canSubmit = useMemo(() => {
    return courseId !== "" && sessionId !== "" && (semester === "first" || semester === "second");
  }, [courseId, sessionId, semester]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    const request = fetch("/api/admin/course-offerings/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_id: courseId,
        session_id: sessionId,
        semester,
        program_id: programId.trim() === "" ? null : programId,
        level: level.trim() === "" ? null : level.trim(),
      }),
    }).then(async (res) => {
      const json: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = isApiErr(json) ? json.error : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return json as ApiOk;
    });

    toast.promise(request, {
      pending: "Creating offering…",
      success: "Course offering created ✅",
      error: {
        render({ data }) {
          return data instanceof Error ? data.message : "Failed to create offering";
        },
      },
    });

    try {
      await request;
      router.push("/dashboard/admin/course-offerings");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
      {/* Keep your existing UI — just bind values */}
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">
            Course <span className="text-red-600">*</span>
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">
            Session <span className="text-red-600">*</span>
          </label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
          >
            <option value="">Select a session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">
            Semester <span className="text-red-600">*</span>
          </label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value as Semester | "")}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
          >
            <option value="">Select a semester</option>
            <option value="first">First Semester</option>
            <option value="second">Second Semester</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">Program (optional)</label>
          <select
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
          >
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">Level (optional)</label>
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="e.g. 100, 200, ND1, HND2"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 p-6 flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <BookOpen className="h-4 w-4 transition-transform group-hover:scale-110" />
          {isSubmitting ? "Creating…" : "Create Offering"}
        </button>
      </div>
    </form>
  );
}
