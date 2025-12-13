"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { Button } from "@/components/ui/button";

type Semester = "first" | "second";
type PaymentType =
  | "school_fees"
  | "acceptance_fee"
  | "registration_fee"
  | "departmental_fee"
  | "examination_fee"
  | "accommodation_fee"
  | "id_card_fee"
  | "other";

type Option<T extends string> = { value: T; label: string };

const PAYMENT_TYPES: ReadonlyArray<Option<PaymentType>> = [
  { value: "school_fees", label: "School Fees" },
  { value: "acceptance_fee", label: "Acceptance Fee" },
  { value: "registration_fee", label: "Registration Fee" },
  { value: "departmental_fee", label: "Departmental Fee" },
  { value: "examination_fee", label: "Examination Fee" },
  { value: "accommodation_fee", label: "Accommodation/Hostel Fee" },
  { value: "id_card_fee", label: "ID Card Fee" },
  { value: "other", label: "Other" },
];

const SEMESTERS: ReadonlyArray<Option<Semester>> = [
  { value: "first", label: "First Semester" },
  { value: "second", label: "Second Semester" },
];

interface AddReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type SessionRow = { id: string; name: string | null; is_active: boolean };
type SessionsResponse = { ok: true; sessions: SessionRow[] } | { ok: false; error: string };

export default function AddReceiptModal({ isOpen, onClose, onCreated }: AddReceiptModalProps) {
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionOptions, setSessionOptions] = useState<ReadonlyArray<Option<string>>>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [form, setForm] = useState<{
    payment_type: PaymentType | "";
    amount_paid: string;
    amount_expected: string;
    payment_date: string;
    student_id: string;
    semester: Semester | "";
    session_id: string; // uuid string
    transaction_reference: string;
  }>({
    payment_type: "",
    amount_paid: "",
    amount_expected: "",
    payment_date: "",
    student_id: "",
    semester: "",
    session_id: "",
    transaction_reference: "",
  });

  // Lock background scroll (clean UX)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Fetch sessions when opened
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    (async () => {
      try {
        setSessionsLoading(true);
        const res = await fetch("/api/admin/sessions?limit=200", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as SessionsResponse | null;

        if (!res.ok || !payload || payload.ok === false) {
          if (!cancelled) toast.error(payload?.ok === false ? payload.error : "Failed to load sessions");
          return;
        }

        const opts: Option<string>[] = payload.sessions.map((s) => ({
          value: s.id,
          label: s.name ?? s.id,
        }));

        setSessionOptions(opts);

        // ✅ auto-select active session
        const active = payload.sessions.find((s) => s.is_active);
        if (active) {
          setForm((p) => ({ ...p, session_id: active.id }));
        }

        if (!cancelled) setSessionOptions(opts);
      } catch {
        if (!cancelled) toast.error("Failed to load sessions");
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const canSubmit = useMemo(() => {
    return (
      !!form.payment_type &&
      !!form.amount_paid &&
      !!form.payment_date &&
      !!form.student_id &&
      !!receiptFile
    );
  }, [form, receiptFile]);

  async function submit() {
    if (!canSubmit) return toast.error("Please fill all required fields.");

    if (!receiptFile) return toast.error("Receipt file is required.");
    if (receiptFile.size > 5 * 1024 * 1024) return toast.error("Receipt max size is 5MB.");
    if (!receiptFile.type.startsWith("image/") && receiptFile.type !== "application/pdf") {
      return toast.error("Receipt must be an image or PDF.");
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append("payment_type", form.payment_type);
      data.append("amount_paid", form.amount_paid);
      data.append("payment_date", form.payment_date);
      data.append("student_id", form.student_id);
      data.append("receipt", receiptFile);

      // optional fields
      if (form.session_id) data.append("session_id", form.session_id);
      if (form.semester) data.append("semester", form.semester);
      if (form.amount_expected) data.append("amount_expected", form.amount_expected);
      if (form.transaction_reference.trim()) {
        data.append("transaction_reference", form.transaction_reference.trim());
      }

      const res = await fetch("/api/admin/receipts", { method: "POST", body: data });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) return toast.error(payload?.error ?? "Failed to add receipt");

      toast.success("Receipt added");
      onCreated();
      onClose();
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    // ✅ overlay scroll enabled
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto">
      {/* ✅ keep modal centered but allow vertical scroll */}
      <div className="min-h-full flex items-center justify-center p-4 py-10">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Add Receipt</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" disabled={loading}>
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* BODY (scroll if needed) */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <Select
              label="Payment Type"
              required
              value={form.payment_type}
              options={PAYMENT_TYPES as ReadonlyArray<{ value: PaymentType | ""; label: string }>}
              onChange={(value) => setForm((p) => ({ ...p, payment_type: value as PaymentType | "" }))}
            />

            <Select
              label="Semester (optional)"
              value={form.semester}
              options={SEMESTERS as ReadonlyArray<{ value: Semester | ""; label: string }>}
              onChange={(value) => setForm((p) => ({ ...p, semester: value as Semester | "" }))}
            />

            <Select
              label={sessionsLoading ? "Session (loading...)" : "Session (optional)"}
              value={form.session_id}
              options={sessionOptions}
              onChange={(value) => setForm((p) => ({ ...p, session_id: value }))}
            />

            <Input
              label="Amount Expected (optional)"
              type="number"
              value={form.amount_expected}
              onChange={(e) => setForm((p) => ({ ...p, amount_expected: e.target.value }))}
            />

            <Input
              label="Amount Paid"
              type="number"
              required
              value={form.amount_paid}
              onChange={(e) => setForm((p) => ({ ...p, amount_paid: e.target.value }))}
            />

            <Input
              label="Transaction Reference (optional)"
              placeholder="Teller no / Transfer ref"
              value={form.transaction_reference}
              onChange={(e) => setForm((p) => ({ ...p, transaction_reference: e.target.value }))}
            />

            <Input
              label="Payment Date"
              type="date"
              required
              value={form.payment_date}
              onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))}
            />

            <Input
              label="Student ID"
              placeholder="Student UUID"
              required
              value={form.student_id}
              onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))}
            />

            <Input
              label="Receipt (image or PDF)"
              type="file"
              required
              accept="image/*,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>

            <Button
              onClick={submit}
              disabled={loading || !canSubmit}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Receipt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
