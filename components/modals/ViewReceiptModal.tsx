"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";

interface ViewReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: string | null;
  onVerified?: () => void;
}

type ReceiptStatus = "pending" | "approved" | "rejected";

interface ReceiptData {
  id: string;
  student_fee_account_id: string;
  amount_submitted: number;
  approved_amount: number | null;
  transaction_reference: string | null;
  remarks: string | null;
  status: ReceiptStatus;
  created_at: string;
  verified_at: string | null;
  rejected_at: string | null;
  receipt_url: string | null;
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

type ApiError = { ok?: false; error?: string; issues?: unknown };

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function money(v: number | null | undefined) {
  if (v == null) return "—";
  return `₦${v.toLocaleString()}`;
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return "—";
  }
}

function isImageUrl(url: string | null | undefined) {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url);
}

export default function ViewReceiptModal({
  isOpen,
  onClose,
  receiptId,
  onVerified,
}: ViewReceiptModalProps) {
  const rejectTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [rejectMode, setRejectMode] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReceipt(null);
      setRejectMode(false);
      setRemarks("");
      setApproveAmount("");
      setZoom(false);
      setLoading(false);
      setSubmitting(false);
      return;
    }

    setRejectMode(false);
    setRemarks("");
    setZoom(false);
  }, [isOpen, receiptId]);

  useEffect(() => {
    if (!isOpen || !receiptId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const res = await fetch(`/api/admin/receipts/${receiptId}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = await readJson<{ receipt: ReceiptData; error?: string }>(res);

        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load receipt");
        }

        if (!payload?.receipt) throw new Error("Receipt not found");

        if (!cancelled) {
          setReceipt(payload.receipt);
          setApproveAmount(String(payload.receipt.amount_submitted ?? ""));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load receipt");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, receiptId]);

  useEffect(() => {
    if (rejectMode) {
      window.setTimeout(() => {
        rejectTextareaRef.current?.focus();
      }, 0);
    }
  }, [rejectMode]);

  async function patchReceipt(action: "approve" | "reject") {
    if (!receiptId || !receipt) return;

    if (action === "reject" && !remarks.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    if (action === "approve") {
      const approvedAmount = Number(approveAmount);

      if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
        toast.error("Enter a valid approved amount");
        return;
      }

      setSubmitting(true);

      try {
        const res = await fetch(`/api/admin/receipts/${receiptId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            approved_amount: approvedAmount,
          }),
        });

        const payload = await readJson<ApiError>(res);

        if (!res.ok) {
          toast.error(payload?.error || "Request failed");
          return;
        }

        toast.success("Receipt approved");
        onVerified?.();
        onClose();
      } catch {
        toast.error("Server error");
      } finally {
        setSubmitting(false);
      }

      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/receipts/${receiptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          remarks: remarks.trim(),
        }),
      });

      const payload = await readJson<ApiError>(res);

      if (!res.ok) {
        toast.error(payload?.error || "Request failed");
        return;
      }

      toast.success("Receipt rejected");
      onVerified?.();
      onClose();
    } catch {
      toast.error("Server error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const canAct = !loading && !!receipt && receipt.status === "pending" && !submitting;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Receipt Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close"
            disabled={submitting}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto min-w-0">
          {loading ? (
            <div className="w-full flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : !receipt ? (
            <p className="text-center text-gray-600 py-10">No data found</p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                <div className="space-y-6 min-w-0">
                  <div className="bg-gray-50 p-4 rounded-xl grid sm:grid-cols-2 gap-4 border">
                    <div>
                      <p className="text-xs text-gray-500">Student Name</p>
                      <p className="font-semibold text-gray-900">
                        {receipt.students.profiles.first_name}{" "}
                        {receipt.students.profiles.last_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Matric No</p>
                      <p className="font-medium">{receipt.students.matric_no ?? "—"}</p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{receipt.students.profiles.email ?? "—"}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Submitted Amount</span>
                      <span className="font-semibold">{money(receipt.amount_submitted)}</span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Approved Amount</span>
                      <span className="font-semibold">{money(receipt.approved_amount)}</span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Reference</span>
                      <span className="font-semibold text-right break-all">
                        {receipt.transaction_reference ?? "—"}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Submitted Date</span>
                      <span className="font-semibold">{fmtDate(receipt.created_at)}</span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Verified Date</span>
                      <span className="font-semibold">{fmtDate(receipt.verified_at)}</span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Rejected Date</span>
                      <span className="font-semibold">{fmtDate(receipt.rejected_at)}</span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Status</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          receipt.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : receipt.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {receipt.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Annual Fee</span>
                      <span className="font-semibold">{money(receipt.annual_fee)}</span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Total Approved Paid</span>
                      <span className="font-semibold">{money(receipt.total_paid_approved)}</span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Balance Due</span>
                      <span className="font-semibold">{money(receipt.balance_due)}</span>
                    </div>

                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-gray-600">Payment Status</span>
                      <span className="font-semibold capitalize">
                        {receipt.payment_status ?? "—"}
                      </span>
                    </div>
                  </div>

                  {receipt.remarks ? (
                    <div className="bg-gray-50 p-4 rounded-xl border">
                      <p className="text-xs text-gray-500">Remarks</p>
                      <p className="text-sm text-gray-900 mt-2 whitespace-pre-wrap">
                        {receipt.remarks}
                      </p>
                    </div>
                  ) : null}

                  {receipt.status === "pending" && (
                    <div className="bg-gray-50 p-4 rounded-xl border space-y-4">
                      {!rejectMode ? (
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Approved Amount
                          </label>
                          <input
                            type="number"
                            value={approveAmount}
                            onChange={(e) => setApproveAmount(e.target.value)}
                            className="w-full mt-2 p-3 border rounded-xl bg-white text-sm"
                            disabled={submitting}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Rejection Reason <span className="text-red-600">*</span>
                          </label>
                          <textarea
                            ref={rejectTextareaRef}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Why are you rejecting this receipt?"
                            className="w-full mt-2 p-3 border rounded-xl bg-white text-sm min-h-[120px]"
                            disabled={submitting}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4 min-w-0">
                  <div className="relative border rounded-xl bg-black/5 overflow-auto group min-h-/[320px] sm:min-h-[420px] flex items-center justify-center min-w-0">
                    {receipt.receipt_url ? (
                      isImageUrl(receipt.receipt_url) ? (
                        <>
                          <Image
                            src={receipt.receipt_url}
                            alt="Receipt"
                            width={1000}
                            height={1200}
                            className={`object-contain max-h-[70vh] w-full transition-all ${
                              zoom ? "scale-125 sm:scale-150" : "scale-100"
                            }`}
                            priority
                          />
                          <button
                            onClick={() => setZoom((z) => !z)}
                            className="absolute top-3 right-3 bg-white p-2 rounded-full shadow hover:bg-gray-100"
                            aria-label={zoom ? "Zoom out" : "Zoom in"}
                            disabled={submitting}
                          >
                            {zoom ? (
                              <ZoomOut className="w-5 h-5" />
                            ) : (
                              <ZoomIn className="w-5 h-5" />
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-6">
                          <p className="text-sm text-gray-700 mb-4">
                            PDF uploaded. Preview not shown here.
                          </p>
                          <a
                            href={receipt.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                          >
                            Open PDF
                          </a>
                        </div>
                      )
                    ) : (
                      <p className="text-sm text-gray-500">No receipt file available.</p>
                    )}
                  </div>

                  {receipt.receipt_url ? (
                    <a
                      href={receipt.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium"
                    >
                      Open Receipt in New Tab
                    </a>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        {receipt?.status === "pending" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 border-t bg-gray-50">
            <button
              onClick={() =>
                rejectMode ? patchReceipt("reject") : setRejectMode(true)
              }
              className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={!canAct}
            >
              {submitting && rejectMode ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              {rejectMode ? "Submit Rejection" : "Reject"}
            </button>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
              {rejectMode ? (
                <button
                  onClick={() => {
                    setRejectMode(false);
                    setRemarks("");
                  }}
                  className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
              ) : null}

              {!rejectMode && (
                <button
                  onClick={() => patchReceipt("approve")}
                  className="px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={!canAct}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  Approve
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}