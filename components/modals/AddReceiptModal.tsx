'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { Button } from '@/components/ui/button';

interface AddReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PAYMENT_TYPES = [
  { value: 'school_fees', label: 'School Fees' },
  { value: 'acceptance_fee', label: 'Acceptance Fee' },
  { value: 'hostel_fee', label: 'Hostel Fee' },
  { value: 'departmental_fee', label: 'Departmental Fee' },
  { value: 'library_fee', label: 'Library Fee' },
  { value: 'other', label: 'Other' },
];

export default function AddReceiptModal({
  isOpen,
  onClose,
  onCreated,
}: AddReceiptModalProps) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    payment_type: '',
    amount_paid: '',
    payment_date: '',
    student_id: '',
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  if (!isOpen) return null;

  async function submit() {
    const { payment_type, amount_paid, payment_date, student_id } = form;

    if (
      !payment_type ||
      !amount_paid ||
      !payment_date ||
      !student_id ||
      !receiptFile
    ) {
      return toast.error('All fields are required');
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append('payment_type', payment_type);
      data.append('amount_paid', amount_paid);
      data.append('payment_date', payment_date);
      data.append('student_id', student_id);
      data.append('receipt', receiptFile);

      const res = await fetch('/api/admin/receipts', {
        method: 'POST',
        body: data,
      });

      if (!res.ok) throw new Error();

      toast.success('Receipt added');
      onCreated();
      onClose();
    } catch {
      toast.error('Failed to add receipt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Receipt
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4">

          {/* PAYMENT TYPE — SHARED SELECT */}
          <Select
            label="Payment Type"
            required
            value={form.payment_type}
            options={PAYMENT_TYPES}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, payment_type: value }))
            }
          />

          <Input
            label="Amount Paid"
            type="number"
            required
            value={form.amount_paid}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, amount_paid: e.target.value }))
            }
          />

          <Input
            label="Payment Date"
            type="date"
            required
            value={form.payment_date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, payment_date: e.target.value }))
            }
          />

          <Input
            label="Student ID"
            placeholder="Student UUID"
            required
            value={form.student_id}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, student_id: e.target.value }))
            }
          />

          <Input
            label="Receipt Image"
            type="file"
            required
            accept="image/*"
            onChange={(e) =>
              setReceiptFile(e.target.files?.[0] || null)
            }
          />
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
          {/* Cancel */}
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancel
          </Button>

          {/* Primary — RED (matches your other modals) */}
          <Button
            onClick={submit}
            disabled={loading}
            className="cursor-pointer bg-red-600 text-white hover:bg-red-700"
          >
            {loading && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Add Receipt
          </Button>
        </div>

      </div>
    </div>
  );
}
