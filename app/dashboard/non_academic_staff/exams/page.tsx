"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

type Course = { code: string; title: string };
type Session = { name: string };

type Offering = {
  id: string;
  semester: string;
  level: string | null;
  courses: Course | Course[];
  sessions: Session | Session[];
};

type OfferingsApi = { offerings: Offering[] };

function isOfferingsApi(v: unknown): v is OfferingsApi {
  return (
    typeof v === "object" &&
    v !== null &&
    "offerings" in v &&
    Array.isArray((v as { offerings?: unknown }).offerings)
  );
}

export default function ExamsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/exams/course-offerings", { cache: "no-store" });
      const json: unknown = await res.json().catch(() => ({}));

      console.log("exams offerings response:", json);

      if (!res.ok) throw new Error();

      if (!isOfferingsApi(json)) {
        setOfferings([]);
        toast.error("Unexpected response from server");
        return;
      }

      setOfferings(json.offerings ?? []);
    } catch {
      toast.error("Failed to load course offerings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    // For now we only know offerings count from this page's API.
    // We'll wire enrollments/results when those endpoints exist.
    return {
      publishedOfferings: offerings.length,
      totalEnrollments: null as number | null,
      resultsSubmitted: null as number | null,
    };
  }, [offerings.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Exams</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage course offerings, rosters, and results.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-green-200 bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-green-200 bg-white p-4">
          <p className="text-xs font-medium text-green-700">Published offerings</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {stats.publishedOfferings}
          </p>
        </div>


        <div className="rounded-xl border border-green-100 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total enrollments</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.totalEnrollments === null ? "—" : stats.totalEnrollments}
          </p>
        </div>

        <div className="rounded-xl border border-green-100 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Results submitted</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.resultsSubmitted === null ? "—" : stats.resultsSubmitted}
          </p>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-600">Loading…</p>}

      {!loading && offerings.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            No published course offerings yet.
          </p>
          <p className="mt-1 text-sm text-green-700">
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
              className="rounded-xl border bg-white p-4 hover:bg-green-50 hover:border-green-200 transition-colors"
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
