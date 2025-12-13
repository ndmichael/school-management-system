"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  Filter,
  Eye,
  Plus, 
  Download,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";

import AddReceiptModal from "@/components/modals/AddReceiptModal";
import ViewReceiptModal from "@/components/modals/ViewReceiptModal";
import { Button } from "@/components/ui/button";

interface ReceiptRow {
  id: string;
  payment_type: string;
  amount_paid: number;
  payment_date: string;
  receipt_url: string;

  status: "pending" | "approved" | "rejected";

  students: {
    id: string;
    matric_no: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };

  sessions: {
    name: string | null;
  } | null;
}

export default function ReceiptsPage() {
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [viewId, setViewId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false); // ✅ FIXED

  // ============================
  // FETCH RECEIPTS
  // ============================
  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/admin/receipts?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to load receipts");

      const json = await res.json();
      setReceipts(json.receipts || []);
    } catch {
      toast.error("Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // ============================
  // DELETE RECEIPT
  // ============================
  async function deleteReceipt(id: string) {
    if (!confirm("Delete this receipt?")) return;

    const res = await fetch(`/api/admin/receipts/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) return toast.error("Failed to delete receipt");

    toast.success("Receipt deleted");
    loadReceipts();
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 space-y-10">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Receipts</h1>
            <p className="text-gray-600 mt-1">
              Verification & financial tracking
            </p>
          </div>

          {/* ADD RECEIPT BUTTON */}
          <Button onClick={() => setAddOpen(true)}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700" 
          >
            <Plus className="h-5 w-5" />
            Add Receipt
          </Button>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">

            {/* SEARCH */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                className="w-full pl-12 pr-4 py-3 border rounded-xl bg-white text-sm"
                placeholder="Search receipt, matric no, student name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* STATUS FILTER */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                className="px-4 py-3 border rounded-xl bg-white text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-6 py-4 font-semibold">Payment Type</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Loading receipts…
                    </td>
                  </tr>
                )}

                {!loading && receipts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      No receipts found
                    </td>
                  </tr>
                )}

                {!loading &&
                  receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">

                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {r.students.profiles.first_name}{" "}
                          {r.students.profiles.last_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {r.students.matric_no}
                        </p>
                      </td>

                      <td className="px-6 py-4 capitalize">
                        {r.payment_type.replace(/_/g, " ")}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-900">
                        {formatCurrency(r.amount_paid)}
                      </td>

                      <td className="px-6 py-4">
                        {formatDate(r.payment_date)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                            r.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : r.status === "pending"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                          {r.status === "pending" && <Clock className="w-3 h-3" />}
                          {r.status === "rejected" && <XCircle className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">

                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            onClick={() => setViewId(r.id)}
                          >
                            <Eye className="w-4 h-4 text-gray-700" />
                          </button>

                          <a
                            href={r.receipt_url}
                            target="_blank"
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <Download className="w-4 h-4 text-gray-700" />
                          </a>

                          <button
                            className="p-2 hover:bg-red-100 rounded-lg"
                            onClick={() => deleteReceipt(r.id)}
                          >
                            <XCircle className="w-4 h-4 text-red-600" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALS */}
        <ViewReceiptModal
          isOpen={!!viewId}
          receiptId={viewId}
          onClose={() => setViewId(null)}
          onVerified={loadReceipts}
        />

        <AddReceiptModal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={loadReceipts}
        />

      </div>
    </div>
  );
}
