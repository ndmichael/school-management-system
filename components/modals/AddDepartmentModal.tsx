'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Input } from '@/components/shared/Input';
import { AdminPrimaryButton } from '@/components/shared/AdminPrimaryButton';
import { toast } from 'react-toastify';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

type DepartmentRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hod_profile_id: string | null;
};

type StaffOption = {
  profile_id: string;
  staff_id: string;
  name: string;
  email: string;
  designation: string | null;
};

interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (dept: DepartmentRow) => void;
}

interface FormErrors {
  name?: string;
  code?: string;
}

export function AddDepartmentModal({ isOpen, onClose, onCreated }: AddDepartmentModalProps) {
  const supabase = createClient();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [hodProfileId, setHodProfileId] = useState<string>('');

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const run = async (): Promise<void> => {
      setStaffLoading(true);
      const res = await fetch('/api/admin/staff/academic', { cache: 'no-store' });
      const json: unknown = await res.json().catch(() => []);
      setStaffLoading(false);

      if (!res.ok) {
        toast.error('Failed to load academic staff');
        setStaffOptions([]);
        return;
      }

      setStaffOptions(Array.isArray(json) ? (json as StaffOption[]) : []);
    };

    run();
  }, [isOpen]);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Department name is required';
    if (!code.trim()) e.code = 'Department code is required';
    if (code.trim().length < 2 || code.trim().length > 5) {
      e.code = 'Code must be between 2–5 characters';
    }
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
      .insert({
        name: name.trim(),
        code: code.toUpperCase().trim(),
        description: description.trim() || null,
        is_active: true,
        hod_profile_id: hodProfileId.trim() === '' ? null : hodProfileId,
      })
      .select('*')
      .single<DepartmentRow>();

    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create department');
      return;
    }

    onCreated(data);
    toast.success(`Department created: ${data.code} — ${data.name}`);

    // reset
    setName('');
    setCode('');
    setDescription('');
    setHodProfileId('');
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Department" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info bar */}
        <div className="flex gap-3 rounded-xl border border-muted bg-muted/60 p-4 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-admin-600" />
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Create a new department
            </p>
            <p>
              HOD is optional and can be assigned later. Code should be 2–5 characters.
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
            rows={3}
            placeholder="Short description of this department..."
            className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm text-foreground outline-none opacity-100 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-admin-600 focus-visible:ring-offset-1"
          />
        </div>

        {/* HOD */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            Head of Department <span className="text-muted-foreground/60">(optional)</span>
          </label>

          <select
            value={hodProfileId}
            onChange={(e) => setHodProfileId(e.target.value)}
            className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm text-foreground outline-none opacity-100 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-admin-600 focus-visible:ring-offset-1"
          >
            <option value="">No HOD assigned</option>
            {staffOptions.map((s) => (
              <option key={s.profile_id} value={s.profile_id}>
                {s.name} ({s.staff_id})
              </option>
            ))}
          </select>

          {staffLoading && (
            <p className="text-xs text-muted-foreground">Loading academic staff…</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-border pt-4">
          <AdminPrimaryButton type="submit" disabled={submitting} className="flex-1" loading={submitting}>
            {submitting ? 'Saving...' : 'Add Department'}
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
