"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Filter, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

// Stats
import { StatCard } from "@/components/shared/StatCard";

// ---- View Details Modal ----
import { ViewStudentDetailsModal } from "@/components/modals/students/ViewStudentDetailsModal";

// ---- Edit Flow ----
import { EditStudentSelectModal } from "@/components/modals/students/EditStudentSelectModal";
import { EditProfileModal } from "@/components/modals/students/EditProfileModal";
import { EditAcademicModal } from "@/components/modals/students/EditAcademicModal";
import { EditGuardianModal } from "@/components/modals/students/EditGuardianModal";

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
  } | null;

  programs: { name: string | null } | null;
  departments: { name: string | null } | null;
  sessions: { name: string | null } | null;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  // ----------------- Modal states -----------------
  const [viewId, setViewId] = useState<string | null>(null);
  const [editSelectId, setEditSelectId] = useState<string | null>(null);

  const [editProfileId, setEditProfileId] = useState<string | null>(null);
  const [editAcademicId, setEditAcademicId] = useState<string | null>(null);
  const [editGuardianId, setEditGuardianId] = useState<string | null>(null);

  // ----------------- LOAD STUDENTS -----------------
  const load = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/admin/students?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to load students");

      const json = await res.json();
      setStudents(json.students || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  // ----------------- DELETE -----------------
  async function deleteStudent(id: string) {
    if (!confirm("Are you sure you want to delete this student?")) return;

    const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });

    if (!res.ok) return toast.error("Failed to delete student");

    setStudents((prev) => prev.filter((s) => s.id !== id));
    toast.success("Student deleted");
  }

  // ----------------- Stats -----------------
  const total = students.length;
  const activeCount = students.filter((s) => s.status === "active").length;
  const suspendedCount = students.filter((s) => s.status === "suspended").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Students</h1>
        <p className="text-gray-600">Manage all registered students</p>
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
            onKeyDown={(e) => e.key === "Enter" && load()}
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

          <button
            onClick={load}
            className="px-4 py-3 bg-red-600 text-white rounded-xl text-sm"
          >
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
                <td colSpan={6} className="p-6 text-center">Loading...</td>
              </tr>
            )}

            {!loading &&
              students.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <Td>
                    <p className="font-semibold">
                      {s.profiles?.first_name} {s.profiles?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{s.profiles?.email}</p>
                  </Td>

                  <Td>{s.matric_no}</Td>
                  <Td>{s.programs?.name || "-"}</Td>
                  <Td>{s.level || "-"}</Td>

                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>

                  <Td className="text-right">
                    <div className="flex justify-end items-center gap-2">

                      {/* VIEW */}
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        onClick={() => setViewId(s.id)}
                      >
                        <Eye className="w-4 h-4 text-gray-700" />
                      </button>

                      {/* EDIT */}
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        onClick={() => setEditSelectId(s.id)}
                      >
                        <Edit className="w-4 h-4 text-gray-700" />
                      </button>

                      {/* DELETE */}
                      <button
                        className="p-2 hover:bg-red-50 rounded-lg"
                        onClick={() => deleteStudent(s.id)}
                      >
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
            <p className="font-semibold">{s.profiles?.first_name} {s.profiles?.last_name}</p>
            <p className="text-xs text-gray-500">{s.profiles?.email}</p>

            <p className="mt-2 text-sm"><strong>Matric:</strong> {s.matric_no}</p>
            <p className="text-sm"><strong>Program:</strong> {s.programs?.name || "-"}</p>

            <div className="flex items-center gap-3 mt-3">

              {/* VIEW */}
              <button
                className="p-2 bg-gray-100 rounded"
                onClick={() => setViewId(s.id)}
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* EDIT */}
              <button
                className="p-2 bg-gray-100 rounded"
                onClick={() => setEditSelectId(s.id)}
              >
                <Edit className="w-4 h-4" />
              </button>

              {/* DELETE */}
              <button
                className="p-2 bg-red-50 rounded"
                onClick={() => deleteStudent(s.id)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>

            </div>
          </div>
        ))}
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* VIEW DETAILS */}
      {viewId && (
        <ViewStudentDetailsModal
          isOpen={true}
          studentId={viewId}
          onClose={() => setViewId(null)}
        />
      )}

      {/* EDIT SELECT */}
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

      {/* PROFILE EDIT */}
      {editProfileId && (
        <EditProfileModal
          isOpen={true}
          studentId={editProfileId}
          onClose={() => setEditProfileId(null)}
          onUpdated={load}
        />
      )}

      {/* ACADEMIC EDIT */}
      {editAcademicId && (
        <EditAcademicModal
          isOpen={true}
          studentId={editAcademicId}
          onClose={() => setEditAcademicId(null)}
          onUpdated={load}
        />
      )}

      {/* GUARDIAN EDIT */}
      {editGuardianId && (
        <EditGuardianModal
          isOpen={true}
          studentId={editGuardianId}
          onClose={() => setEditGuardianId(null)}
          onUpdated={load}
        />
      )}

    </div>
  );
}

/* ---------------- Reusable Components ---------------- */

function Th({ children, className = "" }: any) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: any) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function StatusBadge({ status }: { status: string | null }) {
  const base = "px-3 py-1 rounded-full text-xs font-semibold";

  if (status === "active") return <span className={`${base} bg-green-100 text-green-700`}>Active</span>;
  if (status === "suspended") return <span className={`${base} bg-orange-100 text-orange-700`}>Suspended</span>;
  if (status === "graduated") return <span className={`${base} bg-gray-200 text-gray-700`}>Graduated</span>;

  return <span className={`${base} bg-gray-100 text-gray-600`}>Unknown</span>;
}
