"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

type Offering = {
  id: string;
  semester: string;
  level: string | null;
  courses: { code: string; title: string } | { code: string; title: string }[];
  sessions: { name: string } | { name: string }[];
};

export default function ExamsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/exams/course-offerings", { cache: "no-store" });
        const json: unknown = await res.json();

        console.log("exams offerings response:", json);

        if (!res.ok) throw new Error();

        const j = json as { offerings?: Offering[] };
        setOfferings(j.offerings ?? []);
      } catch {
        toast.error("Failed to load course offerings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exams</h1>

      {loading && <p>Loading…</p>}

      {!loading && offerings.length === 0 && (
        <div className="rounded-xl border bg-white p-4">
            <p className="text-sm font-medium text-gray-900">No published course offerings yet.</p>
            <p className="mt-1 text-sm text-gray-600">
            This page only shows course offerings that have been published by Admin.
            If you expect to see items here, ask an Admin to publish at least one course offering.
            </p>
        </div>
      )}

      <div className="grid gap-4">
        {offerings.map((o) => {
          const course = Array.isArray(o.courses) ? o.courses[0] : o.courses;
          const session = Array.isArray(o.sessions) ? o.sessions[0] : o.sessions;

          return (
            <Link
              key={o.id}
              href={`/dashboard/non_academic_staff/exams/course-offerings/${o.id}`}
              className="p-4 bg-white border rounded-xl hover:bg-gray-50"
            >
              <p className="font-semibold">
                {course?.code ?? "—"} — {course?.title ?? "Untitled"}
              </p>
              <p className="text-sm text-gray-600">
                {session?.name ?? "—"} · {o.semester} · {o.level ?? "-"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
