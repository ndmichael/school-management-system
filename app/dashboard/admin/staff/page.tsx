"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search, Filter, Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "react-toastify";

import { AddStaffModal } from "@/components/modals/AddStaffModal";
import { ViewStaffDetailsModal } from "@/components/modals/staff/ViewStaffDetailsModal";
import { EditStaffModal } from "@/components/modals/staff/EditStaffDetailsModal";

export interface StaffRow {
  id: string;
  staff_id: string;
  designation: string | null;
  specialization: string | null;
  status: string;
  staff_type: string | null;

  // Supabase join alias
  departments: { name: string | null } | null;

  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

const PAGE_SIZE = 10;

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // LOAD STAFF
  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filterRole !== "all") params.set("role", filterRole);

      const res = await fetch(`/api/admin/staff?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to load staff");
      const json = await res.json();

      setStaff(json.staff || []);
      setPage(1); // reset pagination
    } catch (err) {
      console.error(err);
      toast.error("Error loading staff");
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // DELETE STAFF — FIXED (correct route)
  async function deleteStaff(id: string) {
    if (!confirm("Are you sure?")) return;

    const res = await fetch(`/api/admin/staff/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) return toast.error("Failed to delete staff");

    toast.success("Staff removed");
    loadStaff();
  }

  // PAGINATION CALCULATIONS
  const total = staff.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const items = staff.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 space-y-10">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-600 mt-1">Manage academic & non-academic staff</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition"
          >
            <Plus className="w-5 h-5" />
            Add Staff
          </button>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">

            {/* SEARCH */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                className="w-full pl-12 pr-4 py-3 border rounded-xl bg-white text-sm focus:ring-red-500"
                placeholder="Search name, ID, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* ROLE FILTER */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                className="px-4 py-3 border rounded-xl bg-white text-sm focus:ring-red-500"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">All Staff</option>
                <option value="academic_staff">Academic Staff</option>
                <option value="non_academic_staff">Non-Academic Staff</option>
              </select>
            </div>

          </div>
        </div>

        {/* STAFF TABLE */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold">Staff</th>
                  <th className="px-6 py-4 font-semibold">Staff ID</th>
                  <th className="px-6 py-4 font-semibold">Department</th>
                  <th className="px-6 py-4 font-semibold">Designation</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-600">
                      Loading staff...
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-600">
                      No staff found
                    </td>
                  </tr>
                )}

                {!loading &&
                  items.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">

                      {/* Staff Profile */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                            <Image
                              src={s.profiles?.avatar_url || "/avatar.png"}
                              alt="Staff avatar"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {s.profiles?.first_name} {s.profiles?.last_name}
                            </p>
                            <p className="text-xs text-gray-600">{s.profiles?.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">{s.staff_id}</td>

                      {/* Department FIXED */}
                      <td className="px-6 py-4">
                        {s.departments?.name || <span className="text-gray-400">—</span>}
                      </td>

                      <td className="px-6 py-4">{s.designation || "—"}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            s.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3 items-center">
                          
                          {/* VIEW */}
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            onClick={() => setViewId(s.id)}
                          >
                            <Eye className="w-4 h-4 text-gray-700" />
                          </button>

                          {/* EDIT */}
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            onClick={() => setEditId(s.id)}
                          >
                            <Edit className="w-4 h-4 text-gray-700" />
                          </button>

                          {/* DELETE */}
                          <button
                            onClick={() => deleteStaff(s.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t text-sm text-gray-700">
              <span>
                Showing <strong>{startIndex + 1}</strong> -{" "}
                <strong>{Math.min(startIndex + PAGE_SIZE, total)}</strong> of{" "}
                <strong>{total}</strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>

                <span>
                  Page <strong>{currentPage}</strong> of{" "}
                  <strong>{totalPages}</strong>
                </span>

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ADD STAFF MODAL */}
        <AddStaffModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreated={loadStaff}
        />

        {/* VIEW MODAL */}
        {viewId && (
          <ViewStaffDetailsModal
            isOpen={true}
            staffId={viewId}
            onClose={() => setViewId(null)}
          />
        )}

        {/* EDIT MODAL */}
        {editId && (
          <EditStaffModal
            isOpen={true}
            staffId={editId}
            onClose={() => setEditId(null)}
            onUpdated={loadStaff}
          />
        )}

      </div>
    </div>
  );
}
