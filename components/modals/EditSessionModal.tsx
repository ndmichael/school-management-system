'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from './Modal';
import { Input } from '@/components/shared/Input';
import { AdminPrimaryButton } from '@/components/shared/AdminPrimaryButton';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import type { SessionRow, SessionUI } from '@/types/session';

type Semester = 'first' | 'second';

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
  currentSemester: Semester | '';
  studentsCount: string;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  currentSemester?: string;
}

function isSemester(value: unknown): value is Semester {
  return value === 'first' || value === 'second';
}

function getSemesterLabel(semester: Semester): string {
  return semester === 'first' ? 'First Semester' : 'Second Semester';
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

      // CHANGE 1:
      // Invalid old values such as "Academic Session" become empty.
      currentSemester: isSemester(session.currentSemester)
        ? session.currentSemester
        : '',

      studentsCount:
        typeof session.students === 'number' &&
        !Number.isNaN(session.students)
          ? String(session.students)
          : '',
    });

    setErrors({});
  }, [session]);

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (
      key === 'name' ||
      key === 'startDate' ||
      key === 'endDate' ||
      key === 'currentSemester'
    ) {
      setErrors((prev) => ({
        ...prev,
        [key]: undefined,
      }));
    }
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

    // CHANGE 2:
    // An active session must identify its current semester.
    if (form.isActive && !form.currentSemester) {
      e.currentSemester =
        'Current semester is required for an active session';
    }

    return e;
  };

  const handleSubmit = async (
    ev: React.FormEvent<HTMLFormElement>
  ) => {
    ev.preventDefault();

    if (!session) return;

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    const studentsCount = form.studentsCount.trim()
      ? Number(form.studentsCount)
      : null;

    const isBecomingActive =
      form.isActive && session.status !== 'active';

    try {
      if (isBecomingActive) {
        const { error: deactivateError } = await supabase
          .from('sessions')
          .update({ is_active: false })
          .neq('id', session.id);

        if (deactivateError) {
          throw deactivateError;
        }
      }

      const { data, error } = await supabase
        .from('sessions')
        .update({
          name: form.name.trim(),
          start_date: form.startDate,
          end_date: form.endDate,
          is_active: form.isActive,
          current_semester: form.currentSemester || null,
          students_count: studentsCount,
        })
        .eq('id', session.id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      onUpdated(data as SessionRow);
      toast.success('Session updated successfully');
      onClose();
    } catch (error) {
      console.error('Failed to update session:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update session';

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !session) return null;

  const previewReady =
    form.name.trim() &&
    form.startDate &&
    form.endDate &&
    Object.keys(errors).length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      title="Edit Academic Session"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div>
            <p className="mb-1 text-sm font-semibold text-amber-900">
              Editing session
            </p>

            <p>
              Changes apply immediately. Be careful when changing
              active state.
            </p>
          </div>
        </div>

        <Input
          label="Session Name"
          required
          value={form.name}
          onChange={(e) =>
            handleChange('name', e.target.value)
          }
          placeholder="e.g., 2025/2026 Academic Session"
          error={errors.name}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            required
            value={form.startDate}
            onChange={(e) =>
              handleChange('startDate', e.target.value)
            }
            error={errors.startDate}
          />

          <Input
            label="End Date"
            type="date"
            required
            value={form.endDate}
            onChange={(e) =>
              handleChange('endDate', e.target.value)
            }
            error={errors.endDate}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* CHANGE 3:
              Replaced the free-text semester Input with a select. */}
          <div>
            <label
              htmlFor="currentSemester"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Current Semester
              {form.isActive && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </label>

            <select
              id="currentSemester"
              value={form.currentSemester}
              onChange={(e) => {
                const value = e.target.value;

                handleChange(
                  'currentSemester',
                  isSemester(value) ? value : ''
                );
              }}
              aria-invalid={Boolean(errors.currentSemester)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                errors.currentSemester
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-gray-500'
              }`}
            >
              <option value="">Select semester</option>
              <option value="first">First Semester</option>
              <option value="second">Second Semester</option>
            </select>

            {errors.currentSemester && (
              <p className="mt-1 text-xs text-red-600">
                {errors.currentSemester}
              </p>
            )}
          </div>

          <Input
            label="Students (optional)"
            type="number"
            min="0"
            step="1"
            value={form.studentsCount}
            onChange={(e) =>
              handleChange('studentsCount', e.target.value)
            }
            placeholder="e.g., 250"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-gray-900">
              Session status
            </p>

            <p className="text-xs text-gray-600">
              Normally, only one session should be active at a
              time.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              handleChange('isActive', !form.isActive)
            }
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              form.isActive
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-400 bg-slate-50 text-slate-700'
            }`}
          >
            <span
              className={`mr-1 h-2 w-2 rounded-full ${
                form.isActive
                  ? 'bg-green-500'
                  : 'bg-slate-400'
              }`}
            />

            {form.isActive ? 'Active' : 'Inactive'}
          </button>
        </div>

        {previewReady && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <CheckCircle className="h-4 w-4" />
              Updated session preview
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-emerald-700/80">
                  Name:
                </span>
                <p className="font-semibold">{form.name}</p>
              </div>

              <div>
                <span className="text-emerald-700/80">
                  Active:
                </span>
                <p className="font-semibold">
                  {form.isActive ? 'Yes' : 'No'}
                </p>
              </div>

              <div>
                <span className="text-emerald-700/80">
                  Dates:
                </span>
                <p className="font-semibold">
                  {form.startDate} → {form.endDate}
                </p>
              </div>

              {form.currentSemester && (
                <div>
                  <span className="text-emerald-700/80">
                    Semester:
                  </span>
                  <p className="font-semibold">
                    {getSemesterLabel(form.currentSemester)}
                  </p>
                </div>
              )}

              {form.studentsCount && (
                <div>
                  <span className="text-emerald-700/80">
                    Students:
                  </span>
                  <p className="font-semibold">
                    {form.studentsCount}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4 border-t border-gray-200 pt-4">
          <AdminPrimaryButton
            type="submit"
            disabled={submitting}
            className="flex-1"
          >
            {submitting
              ? 'Saving changes...'
              : 'Save changes'}
          </AdminPrimaryButton>

          <button
            type="button"
            onClick={() => {
              if (!submitting) {
                onClose();
              }
            }}
            disabled={submitting}
            className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}