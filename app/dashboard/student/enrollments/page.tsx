"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { SecondaryButton } from "@/components/shared/SecondaryButton";
import { AlertCircle } from "lucide-react";

const MAX_PER_SEMESTER = 10;

type Offering = {
  id: string;
  semester: string | null;
  level: string | null;
  session: {
    id: string;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;
  course: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    credits: number | null;
  } | null;
  lecturers: Array<{ id: string; name: string }>;
};

type EnrollmentRow = { course_offering_id: string };

function semesterLabel(s: string | null): string {
  if (!s) return "Unknown Semester";
  if (s === "first") return "First Semester";
  if (s === "second") return "Second Semester";
  return s;
}

function sessionYearLabel(session: Offering["session"]): string {
  if (!session) return "Session";
  const startY = session.start_date ? new Date(session.start_date).getFullYear() : null;
  const endY = session.end_date ? new Date(session.end_date).getFullYear() : null;

  if (startY && endY) return `${startY}/${endY}`;
  if (session.name && session.name.trim().length > 0) return session.name;
  return "Session";
}

function sessionHeader(session: Offering["session"]): string {
  if (!session) return "Session";
  const year = sessionYearLabel(session);
  if (session.name && session.name.trim().length > 0 && session.name !== year) {
    return `${session.name} (${year})`;
  }
  return year;
}

export default function StudentEnrollmentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorText(null);

      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          setErrorText("Not authenticated.");
          return;
        }

        const { data: student, error: studentErr } = await supabase
          .from("students")
          .select("id, admission_session_id")
          .eq("profile_id", auth.user.id)
          .single();

        if (studentErr) {
          setErrorText(studentErr.message);
          return;
        }

        if (!student?.admission_session_id) {
          setErrorText("Student is missing admission_session_id.");
          return;
        }

        const res = await fetch(
          `/api/student/enrollments/available?session_id=${student.admission_session_id}`
        );

        if (!res.ok) {
          const j: { error?: string } = await res.json().catch(() => ({}));
          setErrorText(j.error ?? "Failed to fetch available course offerings.");
          return;
        }

        const j: { offerings: Offering[] } = await res.json();
        setOfferings(j.offerings ?? []);

        const { data: enrolled, error: enrErr } = await supabase
          .from("enrollments")
          .select("course_offering_id")
          .eq("student_id", student.id)
          .returns<EnrollmentRow[]>();

        if (enrErr) {
          setErrorText(enrErr.message);
          return;
        }

        setEnrolledIds(new Set((enrolled ?? []).map((e) => e.course_offering_id)));
      } catch {
        setErrorText("Network error. Please check your connection and retry.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [supabase]);

  const grouped = useMemo(() => {
    const map = new Map<string, Offering[]>();
    for (const o of offerings) {
      const s = sessionHeader(o.session);
      const sem = semesterLabel(o.semester);
      const key = `${s}__${sem}`;
      const cur = map.get(key);
      if (cur) cur.push(o);
      else map.set(key, [o]);
    }
    return map;
  }, [offerings]);

  const enrolledCountByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, list] of grouped.entries()) {
      const n = list.reduce((acc, o) => acc + (enrolledIds.has(o.id) ? 1 : 0), 0);
      map.set(key, n);
    }
    return map;
  }, [grouped, enrolledIds]);

  const enroll = async (offeringId: string) => {
    setLoadingId(offeringId);
    try {
      const res = await fetch(`/api/student/enrollments/${offeringId}`, { method: "POST" });
      if (!res.ok) {
        const j: { error?: string } = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to enroll");
        return;
      }
      setEnrolledIds((s) => new Set([...s, offeringId]));
      toast.success("Enrolled");
    } finally {
      setLoadingId(null);
    }
  };

  const unenroll = async (offeringId: string) => {
    if (!confirm("Un-enroll from this course?")) return;

    setLoadingId(offeringId);
    try {
      const res = await fetch(`/api/student/enrollments/${offeringId}`, { method: "DELETE" });
      if (!res.ok) {
        const j: { error?: string } = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to un-enroll");
        return;
      }
      setEnrolledIds((s) => {
        const n = new Set(s);
        n.delete(offeringId);
        return n;
      });
      toast.success("Un-enrolled");
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading…</div>;
  }

  if (errorText) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          {errorText}
        </div>
      </div>
    );
  }

  if (offerings.length === 0) {
    return (
      <div className="p-8 text-center text-slate-600">
        No courses available yet for enrollment in this session.
      </div>
    );
  }

  return (
    <div className="space-y-10 p-6">
      {[...grouped.entries()].map(([key, list]) => {
        const [sessionText, semesterText] = key.split("__");
        const used = enrolledCountByGroup.get(key) ?? 0;
        const limitReached = used >= MAX_PER_SEMESTER;

        return (
          <section key={key} className="space-y-4">
            {/* ✅ HEADER WITH PRINT BUTTON (NEW) */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">{sessionText}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="capitalize">{semesterText}</span>
                  <span>•</span>
                  <span>
                    {used}/{MAX_PER_SEMESTER} enrolled
                  </span>
                </div>
              </div>

              <a
                href={`/enrollments/print?session_id=${list[0]?.session?.id}&semester=${
                    semesterText.toLowerCase().includes("first") ? "first" : "second"
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="
                    inline-flex items-center gap-2
                    rounded-lg border border-slate-300
                    bg-slate-50 px-4 py-2
                    text-sm font-medium text-slate-700
                    hover:bg-slate-100 hover:text-slate-900
                "
                >
                🖨️ Print Enrollment Slip
                </a>
            </div>

            <div className="space-y-3">
              {list.slice(0, MAX_PER_SEMESTER).map((o) => {
                const enrolled = enrolledIds.has(o.id);

                return (
                  <div
                    key={o.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Course title */}
                      <div className="font-semibold text-slate-900">
                        <span className="font-mono text-blue-600">{o.course?.code ?? "—"}</span>
                        {" · "}
                        {o.course ? o.course.title : "Course data not loaded"}
                      </div>

                      {/* Course description */}
                      {o.course?.description ? (
                        <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                          {o.course.description}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">No course description available.</p>
                      )}

                      {/* Metadata chips */}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          Session: {sessionYearLabel(o.session)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          Semester: {semesterLabel(o.semester)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          Level: {o.level ?? "All levels"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          Status: {enrolled ? "Enrolled" : "Not enrolled"}
                        </span>
                      </div>

                      {/* Lecturers */}
                      <div className="mt-3 text-sm text-slate-600">
                        <span className="font-medium">Lecturer(s): </span>
                        {o.lecturers.length > 0 ? (
                          o.lecturers.map((l) => l.name).join(", ")
                        ) : (
                          <span className="text-amber-600">No lecturers assigned to this offering.</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {enrolled ? (
                        <SecondaryButton disabled={loadingId === o.id} onClick={() => unenroll(o.id)}>
                          Un-enroll
                        </SecondaryButton>
                      ) : (
                        <PrimaryButton
                          loading={loadingId === o.id}
                          disabled={limitReached}
                          onClick={() => enroll(o.id)}
                        >
                          Enroll Now
                        </PrimaryButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {limitReached && (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4" />
                Maximum courses reached for this group
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}