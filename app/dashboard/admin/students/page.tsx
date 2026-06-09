"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Filter,
  Search,
  Archive,
} from "lucide-react";
import { toast } from "react-toastify";

import { StatCard } from "@/components/shared/StatCard";
import { ViewStudentDetailsModal } from "@/components/modals/students/ViewStudentDetailsModal";
import { EditStudentSelectModal } from "@/components/modals/students/EditStudentSelectModal";
import { EditProfileModal } from "@/components/modals/students/EditProfileModal";
import { EditAcademicModal } from "@/components/modals/students/EditAcademicModal";
import { EditGuardianModal } from "@/components/modals/students/EditGuardianModal";

import {
  toPublicImageSrc,
  type StoredFile,
} from "@/lib/storage-images";
import { createClient } from "@/lib/supabase/client";

export interface StudentRow {
  id: string;
  matric_no: string;
  level: string | null;
  status: string | null;
  created_at: string;
  registration_status: string | null;

  profiles: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string;
    avatar_file: StoredFile | null;
  } | null;

  programs: {
    name: string | null;
  } | null;

  departments: {
    name: string | null;
  } | null;

  sessions: {
    name: string | null;
  } | null;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface StudentStatistics {
  total: number;
  active: number;
  suspended: number;
  newThisMonth: number;
}

interface ActiveSession {
  id: string;
  name: string;
}

interface StudentsListResponse {
  students?: StudentRow[];
  pagination?: PaginationData;
  statistics?: StudentStatistics;
  activeSession?: ActiveSession | null;
  error?: string;
}

interface ApiMessage {
  error?: string;
  message?: string;
}

const DEFAULT_PAGINATION: PaginationData = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
};

const DEFAULT_STATISTICS: StudentStatistics = {
  total: 0,
  active: 0,
  suspended: 0,
  newThisMonth: 0,
};

async function readErrorMessage(
  response: Response,
): Promise<string> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiMessage | null;

    return (
      body?.error ||
      body?.message ||
      `Request failed (${response.status})`
    );
  }

  const text = await response.text().catch(() => "");

  return text.trim()
    ? text.slice(0, 220)
    : `Request failed (${response.status})`;
}

export default function AdminStudentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<20 | 50>(20);

  const [pagination, setPagination] =
    useState<PaginationData>(DEFAULT_PAGINATION);

  const [statistics, setStatistics] =
    useState<StudentStatistics>(DEFAULT_STATISTICS);

  const [activeSession, setActiveSession] =
    useState<ActiveSession | null>(null);

  const [loading, setLoading] = useState(true);
  const [archivingId, setArchivingId] =
    useState<string | null>(null);

  const [viewId, setViewId] = useState<string | null>(null);
  const [editSelectId, setEditSelectId] =
    useState<string | null>(null);

  const [editProfileId, setEditProfileId] =
    useState<string | null>(null);

  const [editAcademicId, setEditAcademicId] =
    useState<string | null>(null);

  const [editGuardianId, setEditGuardianId] =
    useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });

        if (search) {
          params.set("search", search);
        }

        if (filterStatus !== "all") {
          params.set("status", filterStatus);
        }

        const response = await fetch(
          `/api/admin/students?${params.toString()}`,
          {
            cache: "no-store",
            signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response),
          );
        }

        const json =
          (await response.json()) as StudentsListResponse;

        const nextStudents = Array.isArray(json.students)
          ? json.students
          : [];

        const nextPagination =
          json.pagination ?? DEFAULT_PAGINATION;

        setStudents(nextStudents);
        setPagination(nextPagination);
        setStatistics(
          json.statistics ?? DEFAULT_STATISTICS,
        );
        setActiveSession(json.activeSession ?? null);

        /*
         * Handles a page becoming invalid after archiving the
         * final student on that page.
         */
        if (
          nextPagination.total > 0 &&
          page > nextPagination.totalPages
        ) {
          setPage(nextPagination.totalPages);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to load students";

        toast.error(message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [filterStatus, page, pageSize, search],
  );

  /*
   * Debounce the search field.
   */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  /*
   * Load whenever pagination or applied filters change.
   */
  useEffect(() => {
    const controller = new AbortController();

    void load(controller.signal);

    return () => {
      controller.abort();
    };
  }, [load]);

  function changeStatusFilter(value: string) {
    setPage(1);
    setFilterStatus(value);
  }

  function changePageSize(value: string) {
    const parsed = Number(value);

    if (parsed === 20 || parsed === 50) {
      setPage(1);
      setPageSize(parsed);
    }
  }

  async function archiveStudent(student: StudentRow) {
    const fullName = [
      student.profiles?.first_name,
      student.profiles?.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    const confirmed = window.confirm(
      `Archive ${fullName || student.matric_no}?\n\n` +
        "The student will disappear from the active list, but their profile, registrations, results, payments, and academic history will be preserved.",
    );

    if (!confirmed) return;

    try {
      setArchivingId(student.id);

      const response = await fetch(
        `/api/admin/students/${student.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Archived by administrator",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response),
        );
      }

      toast.success("Student archived successfully");

      /*
       * If this was the only student on a page after page one,
       * return to the previous page.
       */
      if (students.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await load();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to archive student";

      toast.error(message);
    } finally {
      setArchivingId(null);
    }
  }

  const firstVisibleStudent =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) *
          pagination.pageSize +
        1;

  const lastVisibleStudent = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Students
          </h1>

          <p className="text-gray-600">
            Manage all registered students
            {activeSession
              ? ` · Current session: ${activeSession.name}`
              : ""}
          </p>
        </div>

        <a
          href="/dashboard/admin/students/new"
          className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          + Create Student
        </a>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={statistics.total}
          color="text-gray-900"
        />

        <StatCard
          label="Active"
          value={statistics.active}
          color="text-green-600"
        />

        <StatCard
          label="Suspended"
          value={statistics.suspended}
          color="text-orange-600"
        />

        <StatCard
          label="New This Month"
          value={statistics.newThisMonth}
          color="text-blue-600"
        />
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

          <input
            type="search"
            placeholder="Search by name, email or matric number..."
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />

            <select
              value={filterStatus}
              onChange={(event) =>
                changeStatusFilter(event.target.value)
              }
              className="rounded-xl border px-4 py-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          <select
            value={pageSize}
            onChange={(event) =>
              changePageSize(event.target.value)
            }
            className="rounded-xl border px-4 py-3 text-sm"
            aria-label="Students per page"
          >
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border bg-white lg:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <Th>Student</Th>
              <Th>Matric No</Th>
              <Th>Program</Th>
              <Th>Level</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-500"
                >
                  Loading students...
                </td>
              </tr>
            )}

            {!loading && students.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-500"
                >
                  No students found.
                </td>
              </tr>
            )}

            {!loading &&
              students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b hover:bg-gray-50"
                >
                  <Td>
                    <StudentIdentity
                      student={student}
                      supabase={supabase}
                    />
                  </Td>

                  <Td>{student.matric_no}</Td>

                  <Td>
                    {student.programs?.name || "—"}
                  </Td>

                  <Td>
                    <div>
                      <p>{student.level || "—"}</p>

                      {student.registration_status ===
                        "not_registered" && (
                        <p className="text-xs text-orange-600">
                          Not registered this session
                        </p>
                      )}
                    </div>
                  </Td>

                  <Td>
                    <StatusBadge
                      status={student.status}
                    />
                  </Td>

                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ActionButton
                        label="View student"
                        onClick={() =>
                          setViewId(student.id)
                        }
                      >
                        <Eye className="h-4 w-4 text-gray-700" />
                      </ActionButton>

                      <ActionButton
                        label="Edit student"
                        onClick={() =>
                          setEditSelectId(student.id)
                        }
                      >
                        <Edit className="h-4 w-4 text-gray-700" />
                      </ActionButton>

                      <ActionButton
                        label="Archive student"
                        disabled={
                          archivingId === student.id
                        }
                        onClick={() =>
                          void archiveStudent(student)
                        }
                        danger
                      >
                        <Archive className="h-4 w-4 text-red-600" />
                      </ActionButton>
                    </div>
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-4 lg:hidden">
        {loading && (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
            Loading students...
          </div>
        )}

        {!loading && students.length === 0 && (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
            No students found.
          </div>
        )}

        {!loading &&
          students.map((student) => (
            <div
              key={student.id}
              className="rounded-xl border bg-white p-4"
            >
              <StudentIdentity
                student={student}
                supabase={supabase}
              />

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Matric:</strong>{" "}
                  {student.matric_no}
                </p>

                <p>
                  <strong>Program:</strong>{" "}
                  {student.programs?.name || "—"}
                </p>

                <p>
                  <strong>Level:</strong>{" "}
                  {student.level || "—"}
                </p>

                <div className="flex items-center gap-2">
                  <strong>Status:</strong>
                  <StatusBadge
                    status={student.status}
                  />
                </div>

                {student.registration_status ===
                  "not_registered" && (
                  <p className="text-orange-600">
                    Not registered for the current session
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <ActionButton
                  label="View student"
                  onClick={() =>
                    setViewId(student.id)
                  }
                >
                  <Eye className="h-4 w-4" />
                </ActionButton>

                <ActionButton
                  label="Edit student"
                  onClick={() =>
                    setEditSelectId(student.id)
                  }
                >
                  <Edit className="h-4 w-4" />
                </ActionButton>

                <ActionButton
                  label="Archive student"
                  disabled={archivingId === student.id}
                  onClick={() =>
                    void archiveStudent(student)
                  }
                  danger
                >
                  <Archive className="h-4 w-4 text-red-600" />
                </ActionButton>
              </div>
            </div>
          ))}
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Showing {firstVisibleStudent}–
            {lastVisibleStudent} of {pagination.total}{" "}
            students
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1),
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="px-2 text-sm text-gray-700">
              Page {pagination.page} of{" "}
              {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={
                pagination.page >=
                pagination.totalPages
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    pagination.totalPages,
                    current + 1,
                  ),
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {viewId && (
        <ViewStudentDetailsModal
          isOpen
          studentId={viewId}
          onClose={() => setViewId(null)}
        />
      )}

      {editSelectId && (
        <EditStudentSelectModal
          isOpen
          studentId={editSelectId}
          onClose={() => setEditSelectId(null)}
          onSelect={(type) => {
            const studentId = editSelectId;

            setEditSelectId(null);

            if (type === "profile") {
              setEditProfileId(studentId);
            }

            if (type === "academic") {
              setEditAcademicId(studentId);
            }

            if (type === "guardian") {
              setEditGuardianId(studentId);
            }
          }}
        />
      )}

      {editProfileId && (
        <EditProfileModal
          isOpen
          studentId={editProfileId}
          onClose={() => setEditProfileId(null)}
          onUpdated={load}
        />
      )}

      {editAcademicId && (
        <EditAcademicModal
          isOpen
          studentId={editAcademicId}
          onClose={() => setEditAcademicId(null)}
          onUpdated={load}
        />
      )}

      {editGuardianId && (
        <EditGuardianModal
          isOpen
          studentId={editGuardianId}
          onClose={() => setEditGuardianId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}

function StudentIdentity({
  student,
  supabase,
}: {
  student: StudentRow;
  supabase: ReturnType<typeof createClient>;
}) {
  const fullName = [
    student.profiles?.first_name,
    student.profiles?.middle_name,
    student.profiles?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
        <Image
          src={toPublicImageSrc(
            supabase,
            student.profiles?.avatar_file,
            "/avatar.png",
          )}
          alt={
            fullName
              ? `${fullName}'s avatar`
              : "Student avatar"
          }
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900">
          {fullName || "Unnamed student"}
        </p>

        <p className="truncate text-xs text-gray-500">
          {student.profiles?.email ?? "—"}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "hover:bg-red-50"
          : "hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 ${className}`}>
      {children}
    </td>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  const base =
    "inline-flex rounded-full px-3 py-1 text-xs font-semibold";

  if (status === "active") {
    return (
      <span
        className={`${base} bg-green-100 text-green-700`}
      >
        Active
      </span>
    );
  }

  if (status === "suspended") {
    return (
      <span
        className={`${base} bg-orange-100 text-orange-700`}
      >
        Suspended
      </span>
    );
  }

  if (status === "graduated") {
    return (
      <span
        className={`${base} bg-gray-200 text-gray-700`}
      >
        Graduated
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-gray-100 text-gray-600`}
    >
      Unknown
    </span>
  );
}