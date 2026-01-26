"use client";

import { useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import Image from "next/image";
import { Search, Filter, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { StatCard } from "@/components/shared/StatCard";
import { ViewStudentDetailsModal } from "@/components/modals/students/ViewStudentDetailsModal";
import { EditStudentSelectModal } from "@/components/modals/students/EditStudentSelectModal";
import { EditProfileModal } from "@/components/modals/students/EditProfileModal";
import { EditAcademicModal } from "@/components/modals/students/EditAcademicModal";
import { EditGuardianModal } from "@/components/modals/students/EditGuardianModal";

import { toPublicImageSrc, type StoredFile } from "@/lib/storage-images";
import { createClient } from "@/lib/supabase/client";

export interface StudentRow {
  id: string;
  matric_no: string;
  level: string | null;
  status: string | null;
  created_at: string;

  profiles: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string;
    avatar_file: StoredFile | null;
  } | null;

  programs: { name: string | null } | null;
  departments: { name: string | null } | null;
  sessions: { name: string | null } | null;
}

type StudentsListResponse = { students?: StudentRow[]; error?: string };

async function readErrorMessage(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    return body?.error || body?.message || `Request failed (${res.status})`;
  }
  const txt = await res.text().catch(() => "");
  return txt.trim() ? txt.slice(0, 220) : `Request failed (${res.status})`;
}

export default function AdminStudentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  const [viewId, setViewId] = useState<string | null>(null);
  const [editSelectId, setEditSelectId] = useState<string | null>(null);

  const [editProfileId, setEditProfileId] = useState<string | null>(null);
  const [editAcademicId, setEditAcademicId] = useState<string | null>(null);
  const [editGuardianId, setEditGuardianId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/admin/students?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await readErrorMessage(res));

      const json = (await res.json()) as StudentsListResponse;
      setStudents(Array.isArray(json.students) ? json.students : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load students";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteStudent(id: string) {
    if (!confirm("Are you sure you want to delete this student?")) return;

    const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });

    if (!res.ok) return toast.error("Failed to delete student");

    setStudents((prev) => prev.filter((s) => s.id !== id));
    toast.success("Student deleted");
  }

  const total = students.length;
  const activeCount = students.filter((s) => s.status === "active").length;
  const suspendedCount = students.filter((s) => s.status === "suspended").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-gray-600">Manage all registered students</p>
        </div>

        {/* CREATE STUDENT (ADMIN) */}
        <a
          href="/dashboard/admin/students/new"
          className="px-4 py-2 rounded-xl text-sm font-medium
                    bg-red-600 text-white hover:bg-red-700"
        >
          + Create Student
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={total} color="text-gray-900" />
        <StatCard label="Active" value={activeCount} color="text-green-600" />
        <StatCard label="Suspended" value={suspendedCount} color="text-orange-600" />
        <StatCard label="New This Month" value={12} color="text-blue-600" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Filter className="w-5 h-5 text-gray-500" />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-xl px-4 py-3 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="graduated">Graduated</option>
          </select>

          <button onClick={() => void load()} className="px-4 py-3 bg-red-600 text-white rounded-xl text-sm">
            Apply
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
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
                <td colSpan={6} className="p-6 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading &&
              students.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                        <Image
                          src={toPublicImageSrc(supabase, s.profiles?.avatar_file, "/avatar.png")}
                          alt="Student avatar"
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {s.profiles?.first_name ?? ""} {s.profiles?.last_name ?? ""}
                        </p>
                        <p className="text-xs text-gray-500">{s.profiles?.email ?? "—"}</p>
                      </div>
                    </div>
                  </Td>

                  <Td>{s.matric_no}</Td>
                  <Td>{s.programs?.name || "-"}</Td>
                  <Td>{s.level || "-"}</Td>

                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>

                  <Td className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={() => setViewId(s.id)}>
                        <Eye className="w-4 h-4 text-gray-700" />
                      </button>

                      <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={() => setEditSelectId(s.id)}>
                        <Edit className="w-4 h-4 text-gray-700" />
                      </button>

                      <button className="p-2 hover:bg-red-50 rounded-lg" onClick={() => void deleteStudent(s.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW */}
      <div className="lg:hidden space-y-4">
        {students.map((s) => (
          <div key={s.id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                <Image
                  src={toPublicImageSrc(supabase, s.profiles?.avatar_file, "/avatar.png")}
                  alt="Student avatar"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>

              <div>
                <p className="font-semibold">
                  {s.profiles?.first_name ?? ""} {s.profiles?.last_name ?? ""}
                </p>
                <p className="text-xs text-gray-500">{s.profiles?.email ?? "—"}</p>
              </div>
            </div>

            <p className="mt-2 text-sm">
              <strong>Matric:</strong> {s.matric_no}
            </p>
            <p className="text-sm">
              <strong>Program:</strong> {s.programs?.name || "-"}
            </p>

            <div className="flex items-center gap-3 mt-3">
              <button className="p-2 bg-gray-100 rounded" onClick={() => setViewId(s.id)}>
                <Eye className="w-4 h-4" />
              </button>

              <button className="p-2 bg-gray-100 rounded" onClick={() => setEditSelectId(s.id)}>
                <Edit className="w-4 h-4" />
              </button>

              <button className="p-2 bg-red-50 rounded" onClick={() => void deleteStudent(s.id)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- MODALS ---------------- */}

      {viewId && (
        <ViewStudentDetailsModal isOpen={true} studentId={viewId} onClose={() => setViewId(null)} />
      )}

      {editSelectId && (
        <EditStudentSelectModal
          isOpen={true}
          studentId={editSelectId}
          onClose={() => setEditSelectId(null)}
          onSelect={(type) => {
            setEditSelectId(null);
            if (type === "profile") setEditProfileId(editSelectId);
            if (type === "academic") setEditAcademicId(editSelectId);
            if (type === "guardian") setEditGuardianId(editSelectId);
          }}
        />
      )}

      {editProfileId && (
        <EditProfileModal isOpen={true} studentId={editProfileId} onClose={() => setEditProfileId(null)} onUpdated={load} />
      )}

      {editAcademicId && (
        <EditAcademicModal isOpen={true} studentId={editAcademicId} onClose={() => setEditAcademicId(null)} onUpdated={load} />
      )}

      {editGuardianId && (
        <EditGuardianModal isOpen={true} studentId={editGuardianId} onClose={() => setEditGuardianId(null)} onUpdated={load} />
      )}
    </div>
  );
}

/* ---------------- Reusable Components ---------------- */

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function StatusBadge({ status }: { status: string | null }) {
  const base = "px-3 py-1 rounded-full text-xs font-semibold";

  if (status === "active") return <span className={`${base} bg-green-100 text-green-700`}>Active</span>;
  if (status === "suspended") return <span className={`${base} bg-orange-100 text-orange-700`}>Suspended</span>;
  if (status === "graduated") return <span className={`${base} bg-gray-200 text-gray-700`}>Graduated</span>;

  return <span className={`${base} bg-gray-100 text-gray-600`}>Unknown</span>;
}
