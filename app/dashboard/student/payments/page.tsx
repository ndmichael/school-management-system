"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/shared/Input";
import { Textarea } from "@/components/shared/Textarea";
import { Eye, Upload, X, Receipt, Wallet } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

type FileRef = {
  bucket: string;
  path: string;
};

type ReceiptStatus = "pending" | "approved" | "rejected";

type StudentRow = {
  id: string;
  profile_id: string;
  matric_no: string | null;
};

type ActiveSessionRow = {
  id: string;
  name: string;
  current_semester: string | null;
  is_active: boolean | null;
};

type StudentRegistrationRow = {
  id: string;
  student_id: string;
  session_id: string;
  level: string | null;
  status: string;
};

type StudentFeeAccountRow = {
  id: string;
  student_registration_id: string;
  program_id: string;
  annual_fee: number | string;
  total_paid_approved: number | string;
  balance_due: number | string | null;
  payment_status: string;
  created_at?: string;
  updated_at?: string;
};

type PaymentReceiptRow = {
  id: string;
  student_fee_account_id: string;
  amount_submitted: number | string;
  approved_amount: number | string | null;
  transaction_reference: string | null;
  remarks: string | null;
  status: ReceiptStatus | string;
  receipt_file: FileRef | null;
  uploaded_by: string | null;
  verified_by: string | null;
  rejected_by: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

const BUCKET = "receipts";
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function money(v: number | string | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return `₦${n.toLocaleString()}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function statusBadge(status: string | null | undefined) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-yellow-100 text-yellow-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "paid") return "bg-green-100 text-green-700";
  if (status === "partial") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-200 text-gray-700";
}

function validateReceiptFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Max ${MAX_FILE_SIZE_MB}MB`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only JPG, PNG, WebP, or PDF files are allowed";
  }
  return null;
}

function isImageFile(file: File | null): boolean {
  return !!file && file.type.startsWith("image/");
}

function isImagePath(path: string | null | undefined): boolean {
  if (!path) return false;
  return /\.(png|jpe?g|webp)$/i.test(path);
}

export default function StudentPaymentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionRow | null>(null);
  const [registration, setRegistration] = useState<StudentRegistrationRow | null>(null);
  const [feeAccount, setFeeAccount] = useState<StudentFeeAccountRow | null>(null);
  const [receipts, setReceipts] = useState<PaymentReceiptRow[]>([]);

  const [statusFilter, setStatusFilter] = useState<"" | ReceiptStatus>("");
  const [amountSubmitted, setAmountSubmitted] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => (statusFilter ? r.status === statusFilter : true));
  }, [receipts, statusFilter]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [receiptPreviewUrl]);

  async function loadEverything() {
    setLoading(true);
    try {
      const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw new Error(sessErr.message);
      const uid = sessRes.session?.user?.id;
      if (!uid) throw new Error("Not authenticated.");

      const { data: activeSess, error: activeSessErr } = await supabase
        .from("sessions")
        .select("id, name, current_semester, is_active")
        .eq("is_active", true)
        .maybeSingle<ActiveSessionRow>();

      if (activeSessErr) throw new Error(activeSessErr.message);
      if (!activeSess?.id) throw new Error("No active session found. Please contact admin.");

      setActiveSession(activeSess);

      const { data: studentRow, error: studentErr } = await supabase
        .from("students")
        .select("id, profile_id, matric_no")
        .eq("profile_id", uid)
        .single<StudentRow>();

      if (studentErr || !studentRow) {
        throw new Error(studentErr?.message || "Student record not found.");
      }

      setStudent(studentRow);

      const { data: regRow, error: regErr } = await supabase
        .from("student_registrations")
        .select("id, student_id, session_id, level, status")
        .eq("student_id", studentRow.id)
        .eq("session_id", activeSess.id)
        .maybeSingle<StudentRegistrationRow>();

      if (regErr) throw new Error(regErr.message);

      setRegistration(regRow ?? null);

      if (!regRow?.id) {
        setFeeAccount(null);
        setReceipts([]);
        return;
      }

      const { data: feeRow, error: feeErr } = await supabase
        .from("student_fee_accounts")
        .select(
          "id, student_registration_id, program_id, annual_fee, total_paid_approved, balance_due, payment_status, created_at, updated_at"
        )
        .eq("student_registration_id", regRow.id)
        .maybeSingle<StudentFeeAccountRow>();

      if (feeErr) throw new Error(feeErr.message);

      setFeeAccount(feeRow ?? null);

      if (!feeRow?.id) {
        setReceipts([]);
        return;
      }

      const { data: receiptRows, error: receiptErr } = await supabase
        .from("payment_receipts")
        .select(
          "id, student_fee_account_id, amount_submitted, approved_amount, transaction_reference, remarks, status, receipt_file, uploaded_by, verified_by, rejected_by, verified_at, rejected_at, created_at, updated_at"
        )
        .eq("student_fee_account_id", feeRow.id)
        .order("created_at", { ascending: false })
        .returns<PaymentReceiptRow[]>();

      if (receiptErr) throw new Error(receiptErr.message);

      setReceipts(receiptRows ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load payments");
      setStudent(null);
      setActiveSession(null);
      setRegistration(null);
      setFeeAccount(null);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadReceipt(file: File): Promise<FileRef> {
    const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) throw new Error(sessErr.message);
    const uid = sessRes.session?.user?.id;
    if (!uid) throw new Error("No active session. Please login again.");

    const ext = file.name.split(".").pop()?.trim().toLowerCase() || "bin";
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) throw new Error(error.message);

    return {
      bucket: BUCKET,
      path,
    };
  }

  function handleReceiptFileChange(file: File | null) {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }

    if (!file) {
      setReceiptFile(null);
      return;
    }

    const err = validateReceiptFile(file);
    if (err) {
      toast.error(err);
      setReceiptFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setReceiptFile(file);
    if (isImageFile(file)) {
      setReceiptPreviewUrl(URL.createObjectURL(file));
    }
  }

  function clearReceiptForm() {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setAmountSubmitted("");
    setTransactionReference("");
    setRemarks("");
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openDrawer(receipt: PaymentReceiptRow) {
    setActiveReceipt(receipt);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    window.setTimeout(() => setActiveReceipt(null), 150);
  }

  async function handleViewReceipt(receipt: PaymentReceiptRow) {
    try {
      if (!receipt.receipt_file?.bucket || !receipt.receipt_file?.path) {
        toast.info("No receipt file attached.");
        return;
      }

      const { data } = supabase.storage
        .from(receipt.receipt_file.bucket)
        .getPublicUrl(receipt.receipt_file.path);

      if (!data?.publicUrl) {
        throw new Error("Could not generate file URL.");
      }

      window.open(data.publicUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to open receipt");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!feeAccount?.id) {
      toast.error("No fee account found for the active session.");
      return;
    }

    const parsedAmount = Number(amountSubmitted);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount greater than 0.");
      return;
    }

    if (!receiptFile) {
      toast.error("Please select a receipt file.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw new Error(sessErr.message);
      const uid = sessRes.session?.user?.id;
      if (!uid) throw new Error("No active session. Please login again.");

      const receiptRef = await uploadReceipt(receiptFile);

      const payload = {
        student_fee_account_id: feeAccount.id,
        amount_submitted: parsedAmount,
        approved_amount: null,
        transaction_reference: transactionReference.trim()
          ? transactionReference.trim()
          : null,
        remarks: remarks.trim() ? remarks.trim() : null,
        status: "pending" as const,
        receipt_file: receiptRef,
        uploaded_by: uid,
        verified_by: null,
        rejected_by: null,
        verified_at: null,
        rejected_at: null,
      };

      const { error: insErr } = await supabase.from("payment_receipts").insert(payload);

      if (insErr) throw new Error(insErr.message);

      toast.success("Receipt submitted for verification.");
      clearReceiptForm();
      await loadEverything();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  const summaryCards = [
    {
      label: "Annual Fee",
      value: money(feeAccount?.annual_fee),
      icon: Wallet,
    },
    {
      label: "Approved Paid",
      value: money(feeAccount?.total_paid_approved),
      icon: Receipt,
    },
    {
      label: "Balance Due",
      value: money(feeAccount?.balance_due),
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500">
          Active session: <span className="font-medium">{activeSession?.name ?? "—"}</span>
        </p>
        <p className="text-sm text-gray-500">
          Matric No: <span className="font-medium">{student?.matric_no ?? "—"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{card.label}</p>
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Account Status</p>
          <div className="mt-3">
            <span
              className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusBadge(
                feeAccount?.payment_status ?? null
              )}`}
            >
              {(feeAccount?.payment_status ?? "—").toString()}
            </span>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Registration: {registration?.status ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">Submitted Receipts</h2>

        <div className="w-full sm:w-64">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as "" | ReceiptStatus) ?? "")}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm bg-white"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Submitted</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Approved</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Reference</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-sm text-gray-600">
                    Loading receipts...
                  </td>
                </tr>
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-sm text-gray-600">
                    No receipts found.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {money(r.amount_submitted)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {money(r.approved_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {r.transaction_reference ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusBadge(
                          r.status
                        )}`}
                      >
                        {String(r.status).charAt(0).toUpperCase() + String(r.status).slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openDrawer(r)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-sm text-gray-600">
            Loading receipts...
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-sm text-gray-600">
            No receipts found.
          </div>
        ) : (
          filteredReceipts.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-900">
                  {money(r.amount_submitted)}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(r.status)}`}>
                  {String(r.status).charAt(0).toUpperCase() + String(r.status).slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                <div>
                  <span className="font-semibold">Approved:</span> {money(r.approved_amount)}
                </div>
                <div>
                  <span className="font-semibold">Reference:</span> {r.transaction_reference ?? "—"}
                </div>
                <div>
                  <span className="font-semibold">Date:</span> {fmtDate(r.created_at)}
                </div>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => openDrawer(r)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                >
                  <Eye className="w-4 h-4" /> View details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Upload Payment Receipt
        </h2>

        {!feeAccount?.id ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            No fee account is available for the active session yet. Contact admissions or bursary.
          </div>
        ) : (
          <form onSubmit={handleUpload} className="space-y-4">
            <Input
              label="Amount Submitted (₦)"
              type="number"
              placeholder="e.g. 25000"
              value={amountSubmitted}
              onChange={(e) => setAmountSubmitted(e.target.value)}
              required
            />

            <Input
              label="Transaction Reference (optional)"
              placeholder="Bank teller / transfer reference"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
            />

            <Input
              ref={fileInputRef}
              label="Receipt File"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => handleReceiptFileChange(e.target.files?.[0] ?? null)}
              required
            />

            {receiptFile ? (
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-xs text-gray-500 mb-2">Selected File</div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{receiptFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearReceiptForm}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-red-600 hover:bg-red-50"
                    aria-label="Remove receipt"
                    title="Remove receipt"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {receiptPreviewUrl ? (
                  <div className="relative w-full h-56 mt-3 rounded-lg overflow-hidden border bg-gray-50">
                    <Image
                      src={receiptPreviewUrl}
                      alt="Receipt preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-3">PDF selected. Preview not shown.</p>
                )}
              </div>
            ) : null}

            <Textarea
              label="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Receipt"}
            </button>
          </form>
        )}
      </div>

      <div
        className={`fixed inset-0 z-50 ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={closeDrawer}
          className={`absolute inset-0 bg-black/30 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-200 ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Receipt Details</p>
                <h3 className="text-base font-semibold text-gray-900">
                  {activeReceipt ? money(activeReceipt.amount_submitted) : "—"}
                </h3>
              </div>

              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {!activeReceipt ? (
                <div className="text-sm text-gray-600">No receipt selected.</div>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Status</span>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(
                          activeReceipt.status
                        )}`}
                      >
                        {String(activeReceipt.status).toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Detail label="Submitted" value={money(activeReceipt.amount_submitted)} />
                      <Detail label="Approved" value={money(activeReceipt.approved_amount)} />
                      <Detail
                        label="Created"
                        value={fmtDate(activeReceipt.created_at)}
                      />
                      <Detail
                        label="Verified At"
                        value={fmtDate(activeReceipt.verified_at)}
                      />
                      <Detail
                        label="Rejected At"
                        value={fmtDate(activeReceipt.rejected_at)}
                      />
                      <Detail
                        label="Reference"
                        value={activeReceipt.transaction_reference ?? "—"}
                      />
                    </div>

                    {activeReceipt.remarks ? (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500">Remarks</p>
                        <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                          {activeReceipt.remarks}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-2">Receipt File</p>

                    {activeReceipt.receipt_file?.bucket && activeReceipt.receipt_file?.path ? (
                      <>
                        {isImagePath(activeReceipt.receipt_file.path) ? (
                          <ReceiptPreview
                            supabase={supabase}
                            fileRef={activeReceipt.receipt_file}
                          />
                        ) : (
                          <p className="text-sm text-gray-700">PDF uploaded (preview not shown).</p>
                        )}

                        <button
                          onClick={() => void handleViewReceipt(activeReceipt)}
                          className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700"
                        >
                          View Receipt
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">No receipt file found.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200">
              <button
                onClick={closeDrawer}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  );
}

function ReceiptPreview({
  supabase,
  fileRef,
}: {
  supabase: ReturnType<typeof createClient>;
  fileRef: FileRef;
}) {
  const publicUrl = useMemo(() => {
    const { data } = supabase.storage.from(fileRef.bucket).getPublicUrl(fileRef.path);
    return data.publicUrl;
  }, [supabase, fileRef.bucket, fileRef.path]);

  return (
    <div className="relative w-full h-56 rounded-lg overflow-hidden border bg-gray-50">
      <Image src={publicUrl} alt="Receipt" fill className="object-contain" />
    </div>
  );
}