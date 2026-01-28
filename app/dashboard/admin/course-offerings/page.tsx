"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Eye, Users } from "lucide-react";
import PublishToggleButton from "./_components/PublishToggleButton";
import CourseOfferingDetailsModal, {
  CourseOfferingDetails,
} from "@/components/modals/CourseOfferingDetailsModal";

/* ================= TYPES ================= */

type ProgramItem = {
  id: string;
  name: string;
};

type OfferingRow = {
  course_offering_id: string;
  course_code: string;
  course_title: string;
  credits: number;
  session_name: string;
  session_active: boolean;
  semester: string;
  programs: ProgramItem[];
  level: string | null;
  is_published: boolean;
  eligible_students: number;
  submitted_results: number;
  pending_results: number;
  assigned_staff: number;
};

/* ================= COMPONENT ================= */

export default function AdminCourseOfferingsPage() {
  const [rows, setRows] = useState<OfferingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal
  const [openModal, setOpenModal] = useState(false);
  const [activeOffering, setActiveOffering] =
    useState<CourseOfferingDetails | null>(null);

  /* ================= DATA ================= */

  const fetchOfferings = async (): Promise<void> => {
    try {
      setError(null);

      const res = await fetch("/api/admin/course-offerings", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load course offerings");

      const json: unknown = await res.json();
      setRows(Array.isArray(json) ? (json as OfferingRow[]) : []);
    } catch {
      setError("Failed to load course offerings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOfferings();
  }, []);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchOfferings();
    setRefreshing(false);
  };

  /* ================= MODAL ================= */

  function openDetails(r: OfferingRow) {
    // ✅ CourseOfferingDetails must match your modal's exported type (new one: programs[])
    const details: CourseOfferingDetails = {
      course_offering_id: r.course_offering_id,
      course_code: r.course_code,
      course_title: r.course_title,
      credits: r.credits,
      session_name: r.session_name,
      session_active: r.session_active,
      semester: r.semester,
      programs: r.programs,
      level: r.level,
      is_published: r.is_published,
      eligible_students: r.eligible_students,
      submitted_results: r.submitted_results,
      pending_results: r.pending_results,
      assigned_staff: r.assigned_staff,
    };

    setActiveOffering(details);
    setOpenModal(true);
  }

  function closeDetails() {
    setOpenModal(false);
    setActiveOffering(null);
  }

  /* ================= RENDER ================= */

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading course offerings…</div>;
  }

  return (
    <div className="space-y-6 pb-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Course Offerings</h2>
          <p className="text-sm text-gray-600">Manage offerings per session & semester</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <Link
            href="/dashboard/admin/course-offerings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Create Offering
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">Course</th>
              <th className="px-6 py-4 text-left">Session</th>
              <th className="px-6 py-4 text-left">Programs</th>
              <th className="px-6 py-4 text-left">
                Students
                <div className="text-xs font-normal text-gray-500">
                  Submitted / Enrolled
                </div>
                </th>
              <th className="px-6 py-4 text-left">Staff</th>
              <th className="px-6 py-4 text-left">Published</th>
              <th className="px-6 py-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.course_offering_id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-semibold">
                    {r.course_code} — {r.course_title}
                  </p>
                  <p className="text-xs text-gray-600">{r.credits} credits</p>
                </td>

                <td className="px-6 py-4">{r.session_name}</td>

                <td className="px-6 py-4 text-sm">
                  {r.programs.length === 0 ? "All Programs" : `${r.programs.length} selected`}
                </td>

                <td className="px-6 py-4 text-sm">
                  {r.submitted_results}/{r.eligible_students}
                </td>

                <td className="px-6 py-4">
                  <Users className="inline h-4 w-4 text-gray-500" /> {r.assigned_staff}
                </td>

                <td className="px-6 py-4">
                  <PublishToggleButton offeringId={r.course_offering_id} isPublished={r.is_published} />
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openDetails(r)}
                      className="rounded-lg p-2 hover:bg-gray-100"
                      title="View details"
                      type="button"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <Link
                      href={`/dashboard/admin/course-offerings/${r.course_offering_id}/edit`}
                      className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Edit
                    </Link>

                    <Link
                      href={`/dashboard/admin/course-offerings/${r.course_offering_id}/assign-staff`}
                      className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Assign Staff
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CourseOfferingDetailsModal
        open={openModal}
        onClose={closeDetails}
        offering={activeOffering}
        showAdminActions
      />
    </div>
  );
}
