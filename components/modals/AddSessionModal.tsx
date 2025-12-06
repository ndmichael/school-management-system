'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from './Modal';
import { Input } from '@/components/shared/Input';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

type SessionRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  registration_start_date: string | null;
  registration_end_date: string | null;
  application_fee: number | null;
  max_applications: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (session: SessionRow) => void;
}

interface FormState {
  name: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  applicationFee: string;
  maxApplications: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
}

export function AddSessionModal({
  isOpen,
  onClose,
  onCreated,
}: AddSessionModalProps) {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>({
    name: '',
    startDate: '',
    endDate: '',
    registrationStartDate: '',
    registrationEndDate: '',
    applicationFee: '',
    maxApplications: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};

    if (!form.name.trim()) {
      e.name = 'Session name is required';
    }

    if (!form.startDate) {
      e.startDate = 'Start date is required';
    }
    if (!form.endDate) {
      e.endDate = 'End date is required';
    }

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) {
        e.endDate = 'End date must be after start date';
      }
    }

    if (form.registrationStartDate && !form.registrationEndDate) {
      e.registrationEndDate = 'Registration end date is required if start date is set';
    }
    if (!form.registrationStartDate && form.registrationEndDate) {
      e.registrationStartDate =
        'Registration start date is required if end date is set';
    }

    if (form.registrationStartDate && form.registrationEndDate) {
      const rs = new Date(form.registrationStartDate);
      const re = new Date(form.registrationEndDate);
      if (re < rs) {
        e.registrationEndDate = 'Registration end must be after start';
      }
    }

    return e;
  };

  const resetForm = () => {
    setForm({
      name: '',
      startDate: '',
      endDate: '',
      registrationStartDate: '',
      registrationEndDate: '',
      applicationFee: '',
      maxApplications: '',
      isActive: true,
    });
    setErrors({});
  };

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();

    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }

    setSubmitting(true);

    const application_fee = form.applicationFee
      ? Number(form.applicationFee)
      : null;
    const max_applications = form.maxApplications
      ? Number(form.maxApplications)
      : null;

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        name: form.name.trim(),
        start_date: form.startDate,
        end_date: form.endDate,
        registration_start_date: form.registrationStartDate || null,
        registration_end_date: form.registrationEndDate || null,
        application_fee,
        max_applications,
        is_active: form.isActive,
      })
      .select('*')
      .single();

    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create session');
      return;
    }

    onCreated(data as SessionRow);
    toast.success('Session created successfully');
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const previewReady =
    form.name &&
    form.startDate &&
    form.endDate &&
    Object.keys(errors).length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Add New Academic Session"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Banner */}
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="mb-1 text-sm font-semibold text-red-900">
              Session guidelines
            </p>
            <p>
              Set clear start and end dates. Active sessions will be highlighted
              across the admin dashboard.
            </p>
          </div>
        </div>

        {/* Name */}
        <Input
          label="Session Name"
          required
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., 2024/2025 Academic Session"
          error={errors.name}
        />

        {/* Dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            error={errors.startDate}
          />
          <Input
            label="End Date"
            type="date"
            required
            value={form.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            error={errors.endDate}
          />
        </div>

        {/* Registration window */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Registration Start (optional)"
            type="date"
            value={form.registrationStartDate}
            onChange={(e) =>
              handleChange('registrationStartDate', e.target.value)
            }
            error={errors.registrationStartDate}
          />
          <Input
            label="Registration End (optional)"
            type="date"
            value={form.registrationEndDate}
            onChange={(e) =>
              handleChange('registrationEndDate', e.target.value)
            }
            error={errors.registrationEndDate}
          />
        </div>

        {/* Fee + Max applications */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Application Fee (optional)"
            type="number"
            min="0"
            step="0.01"
            value={form.applicationFee}
            onChange={(e) => handleChange('applicationFee', e.target.value)}
            placeholder="e.g., 15000"
          />
          <Input
            label="Max Applications (optional)"
            type="number"
            min="0"
            step="1"
            value={form.maxApplications}
            onChange={(e) =>
              handleChange('maxApplications', e.target.value)
            }
            placeholder="e.g., 5000"
          />
        </div>

        {/* Status toggle */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-gray-900">Session status</p>
            <p className="text-xs text-gray-600">
              Active sessions are treated as the current academic session.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange('isActive', !form.isActive)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              form.isActive
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-slate-400 bg-slate-50 text-slate-700'
            }`}
          >
            <span
              className={`mr-1 h-2 w-2 rounded-full ${
                form.isActive ? 'bg-red-500' : 'bg-slate-400'
              }`}
            />
            {form.isActive ? 'Active' : 'Inactive'}
          </button>
        </div>

        {/* Preview */}
        {previewReady && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <CheckCircle className="h-4 w-4" />
              Session Preview
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-emerald-700/80">Name:</span>
                <p className="font-semibold">{form.name}</p>
              </div>
              <div>
                <span className="text-emerald-700/80">Active:</span>
                <p className="font-semibold">
                  {form.isActive ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <span className="text-emerald-700/80">Dates:</span>
                <p className="font-semibold">
                  {form.startDate} → {form.endDate}
                </p>
              </div>
              <div>
                <span className="text-emerald-700/80">Registration:</span>
                <p className="font-semibold">
                  {form.registrationStartDate && form.registrationEndDate
                    ? `${form.registrationStartDate} → ${form.registrationEndDate}`
                    : 'Not configured'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 border-t border-gray-200 pt-4">
          <PrimaryButton
            type="submit"
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? 'Creating...' : 'Create session'}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose();
            }}
            className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
