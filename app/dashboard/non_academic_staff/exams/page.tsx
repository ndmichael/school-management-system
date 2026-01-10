"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

type Offering = {
  id: string;
  semester: string;
  level: string | null;
  courses: { code: string; title: string };
  sessions: { name: string };
};

export default function ExamsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/exams/course-offerings", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setOfferings(json.offerings || []);
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

      <div className="grid gap-4">
        {offerings.map((o) => (
          <Link
            key={o.id}
            href={`/dashboard/non_academic_staff/exams/${o.id}`}
            className="p-4 bg-white border rounded-xl hover:bg-gray-50"
          >
            <p className="font-semibold">
              {o.courses.code} — {o.courses.title}
            </p>
            <p className="text-sm text-gray-600">
              {o.sessions.name} · {o.semester} · {o.level ?? "-"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
