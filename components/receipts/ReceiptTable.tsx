"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import ReceiptFilters from "./ReceiptFilters";
import ReceiptActions from "./ReceiptActions";
import ReceiptPreview from "./ReceiptPreview";

export type ReceiptRole = "admin" | "bursary";

export interface ReceiptRow {
  id: string;
  payment_type: string;
  amount_paid: number;
  payment_date: string;
  receipt_url: string;
  status: "pending" | "approved" | "rejected";
  students: {
    matric_no: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

export default function ReceiptTable({ role }: { role: ReceiptRole }) {
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/receipts?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error();

      const json = await res.json();
      setReceipts(json.receipts ?? []);
    } catch {
      toast.error("Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  return (
    <div className="space-y-6">
      <ReceiptFilters
        search={search}
        status={status}
        onSearch={setSearch}
        onStatusChange={setStatus}
      />

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}

            {!loading &&
              receipts.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">
                      {r.students.profiles.first_name} {r.students.profiles.last_name}
                    </p>
                    <p className="text-xs text-gray-600">{r.students.matric_no}</p>
                  </td>

                  <td className="px-6 py-4 capitalize">
                    {r.payment_type.replace(/_/g, " ")}
                  </td>

                  <td className="px-6 py-4">
                    ₦{r.amount_paid.toLocaleString()}
                  </td>

                  <td className="px-6 py-4">
                    {new Date(r.payment_date).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${r.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : r.status === "pending"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                      {r.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <ReceiptActions
                      role={role}
                      receipt={r}
                      onView={() => setViewId(r.id)}
                      onRefresh={loadReceipts}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <ReceiptPreview
        receiptId={viewId}
        isOpen={!!viewId}
        onClose={() => setViewId(null)}
        onVerified={loadReceipts}
      />
    </div>
  );
}
