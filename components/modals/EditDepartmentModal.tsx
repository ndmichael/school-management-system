'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Input } from '@/components/shared/Input';
import { AdminPrimaryButton } from '@/components/shared/AdminPrimaryButton';
import { toast } from 'react-toastify';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

type Department = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hod_profile_id: string | null;
};

interface EditDepartmentModalProps {
  department: Department;
  onClose: () => void;
  onSaved: (updated: Department) => void;
}

interface FormErrors {
  name?: string;
  code?: string;
}

export function EditDepartmentModal({
  department,
  onClose,
  onSaved,
}: EditDepartmentModalProps) {
  const supabase = createClient();

  const [name, setName] = useState(department.name);
  const [code, setCode] = useState(department.code);
  const [description, setDescription] = useState(department.description ?? '');
  const [isActive, setIsActive] = useState(department.is_active);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Department name is required';
    if (!code.trim()) e.code = 'Department code is required';
    if (code.trim().length < 2 || code.trim().length > 5)
      e.code = 'Code must be between 2–5 characters';
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from('departments')
      .update({
        name: name.trim(),
        code: code.toUpperCase().trim(),
        description: description.trim() || null,
        is_active: isActive,
      })
      .eq('id', department.id)
      .select('*')
      .single();

    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to update department');
      return;
    }

    const updated = data as Department;
    onSaved(updated);
    toast.success(`Department updated: ${updated.code} — ${updated.name}`);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Department"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info bar */}
        <div className="flex gap-3 rounded-xl border border-muted bg-muted/60 p-4 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-admin-600" />
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Update department details
            </p>
            <p>
              Changes will apply immediately to how this department appears
              across the portal.
            </p>
          </div>
        </div>

        {/* Name + Code */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Department Name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={errors.name}
            placeholder="Department name"
          />

          <Input
            label="Department Code"
            required
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setErrors((prev) => ({ ...prev, code: undefined }));
            }}
            error={errors.code}
            placeholder="e.g., MLT"
            maxLength={5}
            className="uppercase"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            Description <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Short description of this department..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-admin-600 focus-visible:ring-offset-1"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-foreground">Department status</p>
            <p className="text-xs text-muted-foreground">
              Inactive departments will be hidden from student-facing flows.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((prev) => !prev)}
            className={[
              'inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
                : 'border-slate-400 bg-slate-400/10 text-slate-700',
            ].join(' ')}
          >
            <span
              className={[
                'mr-1 h-2 w-2 rounded-full',
                isActive ? 'bg-emerald-500' : 'bg-slate-400',
              ].join(' ')}
            />
            {isActive ? 'Active' : 'Inactive'}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-border pt-4">
          <AdminPrimaryButton
            type="submit"
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? 'Saving...' : 'Save changes'}
          </AdminPrimaryButton>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-border bg-muted px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
