"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PublishToggleButton from "./_components/PublishToggleButton";
import { Plus, RefreshCw, Eye, Users } from "lucide-react";
import CourseOfferingDetailsModal, { CourseOfferingDetails } from "@/components/modals/CourseOfferingDetailsModal";


type OfferingRow = {
  course_offering_id: string;
  course_code: string;
  course_title: string;
  credits: number;
  session_name: string;
  session_active: boolean;
  semester: string;
  program_id: string | null;
  level: string | null;
  is_published: boolean;
  eligible_students: number;
  submitted_results: number;
  pending_results: number;
  assigned_staff: number;
};

type PublishedFilter = "all" | "published" | "unpublished";
type SemesterFilter = "all" | "first" | "second";

function toBoolean(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return false;
}

export default function AdminCourseOfferingsPage() {
  const [rows, setRows] = useState<OfferingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState<PublishedFilter>("all");
  const [semester, setSemester] = useState<SemesterFilter>("all");
  const [session, setSession] = useState<string>("all");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modals
  const [openModal, setOpenModal] = useState(false);
    const [activeOffering, setActiveOffering] = useState<CourseOfferingDetails | null>(null);

    function openDetails(r: OfferingRow) {
    setActiveOffering(r);
    setOpenModal(true);
    }
    function closeDetails() {
    setOpenModal(false);
    setActiveOffering(null);
    }


  const fetchOfferings = async (): Promise<void> => {
    try {
      setError(null);

      const res = await fetch("/api/admin/course-offerings", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load course offerings");

      const raw: unknown = await res.json();
      const data = Array.isArray(raw) ? raw : [];

      // ✅ normalize types from API (especially is_published)
      const normalized: OfferingRow[] = data
        .map((r): OfferingRow | null => {
          if (typeof r !== "object" || r === null) return null;
          const o = r as Record<string, unknown>;

          const course_offering_id = typeof o.course_offering_id === "string" ? o.course_offering_id : "";
          const course_code = typeof o.course_code === "string" ? o.course_code : "";
          const course_title = typeof o.course_title === "string" ? o.course_title : "";
          const credits = typeof o.credits === "number" ? o.credits : Number(o.credits ?? 0);
          const session_name = typeof o.session_name === "string" ? o.session_name : "";
          const session_active = toBoolean(o.session_active);
          const semesterVal = typeof o.semester === "string" ? o.semester : "";
          const program_id = typeof o.program_id === "string" ? o.program_id : null;
          const level = typeof o.level === "string" ? o.level : null;
          const is_published = toBoolean(o.is_published);
          const eligible_students =
            typeof o.eligible_students === "number" ? o.eligible_students : Number(o.eligible_students ?? 0);
          const submitted_results =
            typeof o.submitted_results === "number" ? o.submitted_results : Number(o.submitted_results ?? 0);
          const pending_results =
            typeof o.pending_results === "number" ? o.pending_results : Number(o.pending_results ?? 0);
          const assigned_staff =
            typeof o.assigned_staff === "number" ? o.assigned_staff : Number(o.assigned_staff ?? 0);

          if (!course_offering_id || !course_code || !course_title || !session_name || !semesterVal) return null;

          return {
            course_offering_id,
            course_code,
            course_title,
            credits,
            session_name,
            session_active,
            semester: semesterVal,
            program_id,
            level,
            is_published,
            eligible_students,
            submitted_results,
            pending_results,
            assigned_staff,
          };
        })
        .filter((x): x is OfferingRow => x !== null);

      setRows(normalized);
    } catch {
      setError("Unable to load course offerings.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchOfferings();
    setRefreshing(false);
  };

  const sessionOptions = useMemo(() => {
    const unique = new Set<string>();
    rows.forEach((r) => unique.add(r.session_name));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((r) => {
      const matchesSearch =
        q.length === 0 ||
        r.course_code.toLowerCase().includes(q) ||
        r.course_title.toLowerCase().includes(q);

      const matchesPublished =
        published === "all" ||
        (published === "published" ? r.is_published : !r.is_published);

      const matchesSemester =
        semester === "all" || r.semester === semester;

      const matchesSession =
        session === "all" || r.session_name === session;

      return matchesSearch && matchesPublished && matchesSemester && matchesSession;
    });
  }, [rows, search, published, semester, session]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, published, semester, session, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading course offerings…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Offerings</h2>
          <p className="mt-1 text-sm text-gray-600">Manage offerings per session & semester.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold ${
              refreshing
                ? "bg-gray-100 text-gray-500"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search course code/title…"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm sm:w-72"
        />

        <select
          value={published}
          onChange={(e) => setPublished(e.target.value as PublishedFilter)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>

        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value as SemesterFilter)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm"
        >
          <option value="all">All semesters</option>
          <option value="first">First</option>
          <option value="second">Second</option>
        </select>

        <select
          value={session}
          onChange={(e) => setSession(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm"
        >
          <option value="all">All sessions</option>
          {sessionOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={String(pageSize)}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm"
        >
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>

        <div className="ml-auto flex items-center text-sm text-gray-600">
          Showing{" "}
          <span className="mx-1 font-semibold text-gray-900">{pagedRows.length}</span>
          of{" "}
          <span className="mx-1 font-semibold text-gray-900">{filteredRows.length}</span>
        </div>
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="font-semibold text-gray-900">No matching course offerings</p>
          <p className="mt-1 text-sm text-gray-600">Try changing filters or search.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Course</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Session</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Semester</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Scope</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Students</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Staff</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Published</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {pagedRows.map((r) => (
                  <tr key={r.course_offering_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        {r.course_code} — {r.course_title}
                      </p>
                      <p className="text-xs text-gray-600">{r.credits} credits</p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          r.session_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {r.session_name}
                      </span>
                    </td>

                    <td className="px-6 py-4">{r.semester}</td>

                    <td className="px-6 py-4 text-sm">
                      <div>Program: {r.program_id ? "Specific" : "All"}</div>
                      <div>Level: {r.level ?? "All"}</div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <div>Total: {r.eligible_students}</div>
                      <div className="text-xs text-gray-600">
                        Submitted: {r.submitted_results} / Pending: {r.pending_results}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-gray-500" />
                        {r.assigned_staff}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <PublishToggleButton offeringId={r.course_offering_id} isPublished={r.is_published} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openDetails(r)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                            title="View details"
                        >
                            <Eye className="w-4 h-4 text-gray-600" />
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{safePage}</span> of{" "}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Prev
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <CourseOfferingDetailsModal
        open={openModal}
        onClose={closeDetails}
        offering={activeOffering}
        showAdminActions
      />

    </div>
  );
}
