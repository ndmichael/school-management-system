'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from './Modal';
import { Input } from '@/components/shared/Input';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

type SessionStatus = 'active' | 'completed' | 'upcoming';

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
  current_semester: string | null;   // 🔹 new
  students_count: number | null;     // 🔹 new
  created_at: string;
  updated_at: string;
};

type SessionUI = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SessionStatus;
  currentSemester: string;
  students: number;
};

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionUI | null;
  onUpdated: (row: SessionRow) => void;
}

interface FormState {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  currentSemester: string; // 🔹 new
  studentsCount: string;   // 🔹 new
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export function EditSessionModal({
  isOpen,
  onClose,
  session,
  onUpdated,
}: EditSessionModalProps) {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>({
    name: '',
    startDate: '',
    endDate: '',
    isActive: true,
    currentSemester: '',
    studentsCount: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    setForm({
      name: session.name,
      startDate: session.startDate,
      endDate: session.endDate,
      isActive: session.status === 'active',
      currentSemester: session.currentSemester || '',
      studentsCount:
        typeof session.students === 'number' && !Number.isNaN(session.students)
          ? String(session.students)
          : '',
    });
    setErrors({});
  }, [session]);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Session name is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.endDate) e.endDate = 'End date is required';

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) e.endDate = 'End date must be after start date';
    }

    return e;
  };

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!session) return;

    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }

    setSubmitting(true);

    const students_count = form.studentsCount
      ? Number(form.studentsCount)
      : null;

    const { data, error } = await supabase
      .from('sessions')
      .update({
        name: form.name.trim(),
        start_date: form.startDate,
        end_date: form.endDate,
        is_active: form.isActive,
        current_semester: form.currentSemester || null,
        students_count,
      })
      .eq('id', session.id)
      .select('*')
      .single();

    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to update session');
      return;
    }

    onUpdated(data as SessionRow);
    onClose();
  };

  if (!isOpen || !session) return null;

  const previewReady =
    form.name && form.startDate && form.endDate && Object.keys(errors).length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Edit Academic Session"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Banner */}
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="mb-1 text-sm font-semibold text-amber-900">
              Editing session
            </p>
            <p>Changes apply immediately. Be careful when changing active state.</p>
          </div>
        </div>

        {/* Name */}
        <Input
          label="Session Name"
          required
          value={form.name}
          onChange={e => handleChange('name', e.target.value)}
          placeholder="e.g., 2025/2026 Academic Session"
          error={errors.name}
        />

        {/* Dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            required
            value={form.startDate}
            onChange={e => handleChange('startDate', e.target.value)}
            error={errors.startDate}
          />
          <Input
            label="End Date"
            type="date"
            required
            value={form.endDate}
            onChange={e => handleChange('endDate', e.target.value)}
            error={errors.endDate}
          />
        </div>

        {/* 🔹 Semester + Students */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Current Semester / Label (optional)"
            value={form.currentSemester}
            onChange={e => handleChange('currentSemester', e.target.value)}
            placeholder="e.g., Full Year, First Semester"
          />
          <Input
            label="Students (optional)"
            type="number"
            min="0"
            step="1"
            value={form.studentsCount}
            onChange={e => handleChange('studentsCount', e.target.value)}
            placeholder="e.g., 250"
          />
        </div>

        {/* Status toggle */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-gray-900">Session status</p>
            <p className="text-xs text-gray-600">
              Normally, only one session should be active at a time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange('isActive', !form.isActive)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              form.isActive
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-400 bg-slate-50 text-slate-700'
            }`}
          >
            <span
              className={`mr-1 h-2 w-2 rounded-full ${
                form.isActive ? 'bg-green-500' : 'bg-slate-400'
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
              Updated session preview
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-emerald-700/80">Name:</span>
                <p className="font-semibold">{form.name}</p>
              </div>
              <div>
                <span className="text-emerald-700/80">Active:</span>
                <p className="font-semibold">{form.isActive ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-emerald-700/80">Dates:</span>
                <p className="font-semibold">
                  {form.startDate} → {form.endDate}
                </p>
              </div>
              {form.currentSemester && (
                <div>
                  <span className="text-emerald-700/80">Semester:</span>
                  <p className="font-semibold">{form.currentSemester}</p>
                </div>
              )}
              {form.studentsCount && (
                <div>
                  <span className="text-emerald-700/80">Students:</span>
                  <p className="font-semibold">{form.studentsCount}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 border-t border-gray-200 pt-4">
          <PrimaryButton type="submit" disabled={submitting} className="flex-1">
            {submitting ? 'Saving changes...' : 'Save changes'}
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
