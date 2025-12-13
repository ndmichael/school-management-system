"use client";

import { useEffect, useMemo, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

interface ViewReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: string | null;
  onVerified?: () => void;
}

type ReceiptStatus = "pending" | "approved" | "rejected";

interface ReceiptData {
  id: string;
  payment_type: string;
  amount_paid: number;
  payment_date: string;
  receipt_url: string;
  status: ReceiptStatus;
  students: {
    matric_no: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  sessions: { name: string | null } | null;
}

type ApiError = { ok?: false; error?: string; issues?: unknown };

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function ViewReceiptModal({
  isOpen,
  onClose,
  receiptId,
  onVerified,
}: ViewReceiptModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [rejectMode, setRejectMode] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [zoom, setZoom] = useState(false);

  // Optional: if you STILL want to send admin_id from client (not recommended),
  // you can keep this. But better is server-derived admin id in PATCH route.
  const [adminId, setAdminId] = useState<string | null>(null);

  // Load admin session once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error) {
        setAdminId(null);
        return;
      }
      setAdminId(data.user?.id ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Reset UI state when closing/opening or switching receipt
  useEffect(() => {
    if (!isOpen) {
      setReceipt(null);
      setRejectMode(false);
      setRemarks("");
      setZoom(false);
      setLoading(false);
      setSubmitting(false);
      return;
    }
    setRejectMode(false);
    setRemarks("");
    setZoom(false);
  }, [isOpen, receiptId]);

  // Fetch receipt
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

        if (!res.ok) throw new Error("Failed to load receipt");

        const payload = await readJson<{ receipt: ReceiptData }>(res);
        if (!payload?.receipt) throw new Error("Bad response");

        if (!cancelled) setReceipt(payload.receipt);
      } catch {
        if (!cancelled) toast.error("Failed to load receipt");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, receiptId]);

  async function patchReceipt(action: "approve" | "reject") {
    if (!receiptId) return;

    if (action === "reject" && !remarks.trim()) {
      toast.error("Remarks required");
      return;
    }

    // If your PATCH route still expects admin_id, this ensures it's present.
    // If you update PATCH to derive admin id from session, you can delete this check.
    if (!adminId) {
      toast.error("Admin session not found. Please re-login.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/receipts/${receiptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          // ✅ If you update backend to derive admin_id from session, REMOVE this line.
          admin_id: adminId,
          ...(action === "reject" ? { remarks: remarks.trim() } : {}),
        }),
      });

      const payload = await readJson<ApiError>(res);

      if (!res.ok) {
        const msg =
          payload?.error ??
          (payload?.issues ? "Validation failed." : "Request failed.");
        toast.error(msg);
        return;
      }

      toast.success(action === "approve" ? "Receipt approved" : "Receipt rejected");
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
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* HEADER */}
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

        {/* CONTENT */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="w-full flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : !receipt ? (
            <p className="text-center text-gray-600 py-10">No data found</p>
          ) : (
            <>
              {/* STUDENT INFO */}
              <div className="bg-gray-50 p-4 rounded-xl grid sm:grid-cols-2 gap-4 border">
                <div>
                  <p className="text-xs text-gray-500">Student Name</p>
                  <p className="font-semibold text-gray-900">
                    {receipt.students.profiles.first_name}{" "}
                    {receipt.students.profiles.last_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Student ID</p>
                  <p className="font-medium">{receipt.students.matric_no}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{receipt.students.profiles.email}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Session</p>
                  <p className="font-medium">{receipt.sessions?.name || "—"}</p>
                </div>
              </div>

              {/* PAYMENT INFO */}
              <div className="bg-gray-50 p-4 rounded-xl border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Type</span>
                  <span className="font-semibold">{receipt.payment_type}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Semester</span>
                  <span className="font-semibold capitalize">
                    {/* you were showing session name under semester before */}
                    —
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-semibold">
                    ₦{receipt.amount_paid.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Date</span>
                  <span className="font-semibold">{receipt.payment_date}</span>
                </div>

                <div className="flex justify-between text-sm">
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

              {/* RECEIPT IMAGE */}
              <div className="relative border rounded-xl bg-black/5 overflow-hidden group max-h-[450px]">
                <Image
                  src={receipt.receipt_url}
                  alt="Receipt"
                  width={800}
                  height={800}
                  className={`object-contain w-full mx-auto transition-all ${
                    zoom ? "scale-150" : "scale-100"
                  }`}
                  priority
                />

                <button
                  onClick={() => setZoom((z) => !z)}
                  className="absolute top-3 right-3 bg-white p-2 rounded-full shadow hover:bg-gray-100"
                  aria-label={zoom ? "Zoom out" : "Zoom in"}
                  disabled={submitting}
                >
                  {zoom ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                </button>
              </div>

              {/* REJECT REMARKS */}
              {rejectMode && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700">
                    Rejection Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Why are you rejecting this receipt?"
                    className="w-full mt-2 p-3 border rounded-xl bg-white text-sm min-h-[100px]"
                    disabled={submitting}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        {receipt?.status === "pending" && (
          <div className="flex items-center justify-between p-5 border-t bg-gray-50">
            {/* REJECT */}
            <button
              onClick={() => (rejectMode ? patchReceipt("reject") : setRejectMode(true))}
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

            {/* APPROVE */}
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
        )}
      </div>
    </div>
  );
}
