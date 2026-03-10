"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { CreditCard, CheckCircle2, Clock3, XCircle } from "lucide-react";
import ReceiptFilters from "./ReceiptFilters";
import ReceiptActions from "./ReceiptActions";
import ReceiptPreview from "./ReceiptPreview";

export type ReceiptRole = "admin" | "bursary";

export interface ReceiptRow {
  id: string;
  amount_submitted: number;
  approved_amount: number | null;
  transaction_reference: string | null;
  remarks: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  rejected_at: string | null;
  receipt_url: string | null;
  student_fee_account_id: string;
  annual_fee: number;
  total_paid_approved: number;
  balance_due: number | null;
  payment_status: string | null;
  students: {
    matric_no: string | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    };
  };
}

function statusClasses(status: ReceiptRow["status"]) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return `₦${value.toLocaleString()}`;
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

      const res = await fetch(`/api/admin/receipts?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to load receipts");

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

  const stats = useMemo(() => {
    const pending = receipts.filter((r) => r.status === "pending").length;
    const approved = receipts.filter((r) => r.status === "approved").length;
    const rejected = receipts.filter((r) => r.status === "rejected").length;

    return {
      total: receipts.length,
      pending,
      approved,
      rejected,
    };
  }, [receipts]);

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Receipts"
          value={stats.total}
          icon={<CreditCard className="h-5 w-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock3 className="h-5 w-5 text-orange-600" />}
          bg="bg-orange-50"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          bg="bg-green-50"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          bg="bg-red-50"
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <ReceiptFilters
            search={search}
            status={status}
            onSearch={setSearch}
            onStatusChange={setStatus}
          />
        </div>

        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-admin-700 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Add Receipt
        </button>
      </div>

      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden lg:block">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1050px] w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">
                    Reference
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">
                    Approved
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading && receipts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No receipts found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  receipts.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {r.students.profiles.first_name} {r.students.profiles.last_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {r.students.matric_no ?? "—"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {r.students.profiles.email ?? "—"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        <div className="max-w-[180px] truncate">
                          {r.transaction_reference ?? "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-900">
                        {formatMoney(r.amount_submitted)}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {formatMoney(r.approved_amount)}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                            r.status
                          )}`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 whitespace-nowrap">
                          <ReceiptActions
                            role={role}
                            receipt={r}
                            onView={() => setViewId(r.id)}
                            onRefresh={loadReceipts}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="divide-y lg:hidden">
          {loading && (
            <div className="px-5 py-10 text-center text-gray-500">Loading…</div>
          )}

          {!loading && receipts.length === 0 && (
            <div className="px-5 py-10 text-center text-gray-500">No receipts found.</div>
          )}

          {!loading &&
            receipts.map((r) => (
              <div key={r.id} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {r.students.profiles.first_name} {r.students.profiles.last_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {r.students.matric_no ?? "—"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {r.students.profiles.email ?? "—"}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MiniDetail label="Submitted" value={formatMoney(r.amount_submitted)} />
                  <MiniDetail label="Approved" value={formatMoney(r.approved_amount)} />
                  <MiniDetail label="Reference" value={r.transaction_reference ?? "—"} />
                  <MiniDetail
                    label="Date"
                    value={new Date(r.created_at).toLocaleDateString()}
                  />
                </div>

                <div className="overflow-x-auto">
                  <div className="inline-flex items-center gap-2 whitespace-nowrap">
                    <ReceiptActions
                      role={role}
                      receipt={r}
                      onView={() => setViewId(r.id)}
                      onRefresh={loadReceipts}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
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

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}