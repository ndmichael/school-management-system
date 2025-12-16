"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { Textarea } from "@/components/shared/Textarea";
import { Eye, Upload } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

type Semester = "first" | "second";
type Status = "pending" | "approved" | "rejected";
type PaymentType =
  | "school_fees"
  | "acceptance_fee"
  | "registration_fee"
  | "departmental_fee"
  | "examination_fee"
  | "accommodation_fee"
  | "id_card_fee"
  | "other";

type PaymentRow = {
  id: string;
  student_id: string;

  session_id?: string | null;
  semester?: Semester | string | null;

  payment_type: PaymentType | string;
  amount_expected?: number | null;
  amount_paid?: number | null;
  approved_amount?: number | null;

  payment_date?: string | null; // date
  receipt_url: string;

  status: Status | string;
  remarks?: string | null;

  transaction_reference?: string | null;

  uploaded_by?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;

  rejected_by?: string | null;
  rejected_at?: string | null;

  is_late_payment?: boolean | null;

  created_at: string;
  updated_at: string;
};

const BUCKET = "receipts"; // your storage bucket name

function semesterLabel(s: string | null | undefined) {
  if (s === "first") return "First Semester";
  if (s === "second") return "Second Semester";
  return s ?? "—";
}

function paymentTypeLabel(t: string | null | undefined) {
  const map: Record<string, string> = {
    school_fees: "School Fees",
    acceptance_fee: "Acceptance Fee",
    registration_fee: "Registration Fee",
    departmental_fee: "Departmental Fee",
    examination_fee: "Examination Fee",
    accommodation_fee: "Accommodation Fee",
    id_card_fee: "ID Card Fee",
    other: "Other",
  };
  return t ? map[t] ?? t : "—";
}

function statusBadge(status: string | null | undefined) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function money(v: number | null | undefined) {
  return v == null ? "—" : `₦${Number(v).toLocaleString()}`;
}

export default function StudentPaymentsPage() {
  const supabase = createClient();

  const [filterSemester, setFilterSemester] = useState<"" | Semester>("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  // upload form state
  const [paymentType, setPaymentType] = useState<PaymentType | "">("");
  const [semester, setSemester] = useState<Semester | "">("");
  const [amount, setAmount] = useState<string>(""); // maps to amount_paid
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [description, setDescription] = useState(""); // maps to remarks
  const [submitting, setSubmitting] = useState(false);

  const semesterOptions = [
    { value: "first", label: "First Semester" },
    { value: "second", label: "Second Semester" },
  ] as const;

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ] as const;

  const paymentTypeOptions = [
    { value: "school_fees", label: "School Fees" },
    { value: "acceptance_fee", label: "Acceptance Fee" },
    { value: "registration_fee", label: "Registration Fee" },
    { value: "departmental_fee", label: "Departmental Fee" },
    { value: "examination_fee", label: "Examination Fee" },
    { value: "accommodation_fee", label: "Accommodation Fee" },
    { value: "id_card_fee", label: "ID Card Fee" },
    { value: "other", label: "Other" },
  ] as const;

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const semOk = filterSemester ? p.semester === filterSemester : true;
      const stOk = statusFilter ? p.status === statusFilter : true;
      return semOk && stOk;
    });
  }, [payments, filterSemester, statusFilter]);

  async function loadPayments() {
    setLoading(true);
    try {
      const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw new Error(sessErr.message);
      const uid = sessRes.session?.user?.id;
      if (!uid) throw new Error("Not authenticated.");

      const { data: student, error: sErr } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", uid)
        .single<{ id: string }>();

      if (sErr || !student) throw new Error(sErr?.message || "Student record not found.");

      const { data, error } = await supabase
        .from("payment_receipts")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .returns<PaymentRow[]>();

      if (error) throw new Error(error.message);

      setPayments(data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load payments");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleView(payment: PaymentRow) {
    try {
      if (!payment.receipt_url) {
        toast.info("No receipt attached for this payment.");
        return;
      }
      window.open(payment.receipt_url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Unable to open receipt");
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentType) return toast.error("Select payment type.");
    if (!semester) return toast.error("Select semester.");
    if (!paymentProof) return toast.error("Please select a file.");

    const parsedAmount = amount.trim() ? Number(amount) : null;
    if (amount.trim() && (parsedAmount == null || Number.isNaN(parsedAmount))) {
      return toast.error("Amount must be a valid number.");
    }

    setSubmitting(true);

    try {
      const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw new Error(sessErr.message);
      const uid = sessRes.session?.user?.id;
      if (!uid) throw new Error("No active session. Please login again.");

      const { data: student, error: sErr } = await supabase
        .from("students")
        .select("id, profile_id")
        .eq("profile_id", uid)
        .single<{ id: string; profile_id: string }>();

      if (sErr || !student) throw new Error(sErr?.message || "Student record not found.");
      if (student.profile_id !== uid) throw new Error("Student record mismatch.");

      // Upload file to storage
      const ext = paymentProof.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;

      const up = await supabase.storage.from(BUCKET).upload(path, paymentProof, {
        upsert: false,
        contentType: paymentProof.type,
      });
      if (up.error) throw new Error(up.error.message);

      // Convert to public URL (bucket must be public)
      const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
      const receiptUrl = pub.data.publicUrl;
      if (!receiptUrl) throw new Error("Could not generate receipt URL.");

      // ✅ Match your real columns
      const payload = {
        student_id: student.id,
        uploaded_by: uid, // your RLS requires this
        payment_type: paymentType,
        semester: semester,
        amount_paid: parsedAmount,
        receipt_url: receiptUrl, // REQUIRED (NOT NULL)
        status: "pending" as const,
        remarks: description.trim() ? description.trim() : null,
      };

      const { error: insErr } = await supabase.from("payment_receipts").insert(payload);
      if (insErr) {
        throw new Error(
          [insErr.message, insErr.details, insErr.hint, insErr.code ? `code=${insErr.code}` : null]
            .filter(Boolean)
            .join(" | ")
        );
      }

      toast.success("Payment proof submitted for verification.");

      setPaymentType("");
      setSemester("");
      setAmount("");
      setPaymentProof(null);
      setDescription("");

      await loadPayments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>

        <div className="flex flex-col sm:flex-row gap-4">
          <Select<Semester>
            label="Filter by Semester"
            options={semesterOptions}
            value={filterSemester}
            onChange={(v) => setFilterSemester(v)}
          />
          <Select<Status>
            label="Filter by Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[200px]">Payment Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[160px]">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Semester</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-sm text-gray-600">
                    Loading payments...
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const bestAmount = p.amount_paid ?? p.approved_amount ?? p.amount_expected ?? null;
                  const bestDate = p.payment_date ?? p.created_at ?? null;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{paymentTypeLabel(p.payment_type ?? null)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{money(bestAmount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{semesterLabel(p.semester ?? null)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusBadge(p.status)}`}>
                          {(p.status ?? "unknown").charAt(0).toUpperCase() + (p.status ?? "unknown").slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {bestDate ? format(new Date(bestDate), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => void handleView(p)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No payments found for the selected filters</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-sm text-gray-600">
            Loading payments...
          </div>
        ) : (
          filteredPayments.map((p) => {
            const bestAmount = p.amount_paid ?? p.approved_amount ?? p.amount_expected ?? null;
            const bestDate = p.payment_date ?? p.created_at ?? null;

            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900">{paymentTypeLabel(p.payment_type ?? null)}</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(p.status)}`}>
                    {(p.status ?? "unknown").charAt(0).toUpperCase() + (p.status ?? "unknown").slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <div>
                    <span className="font-semibold">Amount:</span> {money(bestAmount)}
                  </div>
                  <div>
                    <span className="font-semibold">Semester:</span> {semesterLabel(p.semester ?? null)}
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">Date:</span>{" "}
                    {bestDate ? format(new Date(bestDate), "dd MMM yyyy") : "—"}
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => void handleView(p)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                </div>
              </div>
            );
          })
        )}

        {!loading && filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No payments found for the selected filters</p>
          </div>
        )}
      </div>

      {/* Upload Payment Proof Form */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Upload Payment Proof
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <Select<PaymentType>
            label="Payment Type"
            options={paymentTypeOptions}
            value={paymentType}
            onChange={(v) => setPaymentType(v)}
            required
          />

          <Select<Semester>
            label="Semester"
            options={semesterOptions}
            value={semester}
            onChange={(v) => setSemester(v)}
            required
          />

          <Input
            label="Amount Paid (₦)"
            type="number"
            placeholder="e.g. 250000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Input
            label="Select File"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
            required
          />

          {paymentProof && paymentProof.type.startsWith("image/") ? (
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="text-xs text-gray-500 mb-2">Preview</div>
              <div className="relative w-full h-48">
                <Image src={URL.createObjectURL(paymentProof)} alt="Payment proof preview" fill className="object-contain" />
              </div>
            </div>
          ) : null}

          <Textarea
            label="Remarks (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Upload Proof"}
          </button>
        </form>
      </div>
    </div>
  );
}
