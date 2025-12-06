'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from './Modal';
import { Input } from '@/components/shared/Input';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { AlertCircle, CheckCircle, GraduationCap } from 'lucide-react';
import { toast } from 'react-toastify';

type ProgramType = 'certificate' | 'diploma' | 'nd' | 'hnd' | 'post_basic';
type ProgramLevel = 'basic' | 'post_basic' | 'nd' | 'hnd';

export type ProgramRow = {
  id: string;
  name: string;
  code: string;
  type: ProgramType;
  level: ProgramLevel;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  requirements: string | null;
  features: string[] | null;
  description: string | null;
};

type DepartmentSummary = {
  id: string;
  name: string;
  code: string;
};

interface AddProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (program: ProgramRow) => void;
  departments: DepartmentSummary[];
}

interface FormState {
  name: string;
  code: string;
  type: ProgramType;
  level: ProgramLevel;
  departmentId: string | 'none';
  description: string;
  requirements: string;
  features: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  code?: string;
  type?: string;
  level?: string;
}

const typeOptions: { value: ProgramType; label: string }[] = [
  { value: 'certificate', label: 'Certificate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'nd', label: 'ND' },
  { value: 'hnd', label: 'HND' },
  { value: 'post_basic', label: 'Post Basic' },
];

const levelOptions: { value: ProgramLevel; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'post_basic', label: 'Post Basic' },
  { value: 'nd', label: 'ND' },
  { value: 'hnd', label: 'HND' },
];

export function AddProgramModal({
  isOpen,
  onClose,
  onCreated,
  departments,
}: AddProgramModalProps) {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>({
    name: '',
    code: '',
    type: 'certificate',
    level: 'basic',
    departmentId: 'none',
    description: '',
    requirements: '',
    features: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'name' || key === 'code' || key === 'type' || key === 'level') {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};

    if (!form.name.trim()) {
      e.name = 'Program name is required';
    } else if (form.name.trim().length < 3) {
      e.name = 'Program name must be at least 3 characters';
    }

    if (!form.code.trim()) {
      e.code = 'Program code is required';
    } else if (form.code.trim().length < 2 || form.code.trim().length > 8) {
      e.code = 'Code must be between 2-8 characters';
    }

    if (!form.type) {
      e.type = 'Program type is required';
    }
    if (!form.level) {
      e.level = 'Program level is required';
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

    const department_id =
      form.departmentId === 'none' ? null : (form.departmentId as string);

    const featuresArray =
      form.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean) || null;

    const { data, error } = await supabase
      .from('programs')
      .insert({
        name: form.name.trim(),
        code: form.code.toUpperCase().trim(),
        type: form.type,
        level: form.level,
        department_id,
        is_active: form.isActive,
        description: form.description.trim() || null,
        requirements: form.requirements.trim() || null,
        features: featuresArray,
        // image_url remains null for now (static /public used on UI)
      })
      .select('*')
      .single();

    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create program');
      return;
    }

    onCreated(data as ProgramRow);

    toast.success('Program created successfully');

    // reset + close
    setForm({
      name: '',
      code: '',
      type: 'certificate',
      level: 'basic',
      departmentId: 'none',
      description: '',
      requirements: '',
      features: '',
      isActive: true,
    });
    setErrors({});
    onClose();
  };

  const previewReady =
    form.name &&
    form.code &&
    form.type &&
    form.level &&
    Object.keys(errors).length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Program"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info banner */}
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
          <GraduationCap className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Program configuration
            </p>
            <p>
              Programs belong to departments and define what students can apply
              for, including type (Certificate, ND, HND) and level.
            </p>
          </div>
        </div>

        {/* Name & Code */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Program Name"
            required
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="e.g., Pharmacy Technician"
          />

          <Input
            label="Program Code"
            required
            value={form.code}
            onChange={(e) =>
              handleChange('code', e.target.value.toUpperCase())
            }
            error={errors.code}
            placeholder="e.g., PT"
            maxLength={8}
            className="uppercase"
          />
        </div>

        {/* Type & Level */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Program Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                handleChange('type', e.target.value as ProgramType)
              }
              className={cnBaseSelect(errors.type)}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.type}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Program Level <span className="text-red-500">*</span>
            </label>
            <select
              value={form.level}
              onChange={(e) =>
                handleChange('level', e.target.value as ProgramLevel)
              }
              className={cnBaseSelect(errors.level)}
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.level && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.level}
              </p>
            )}
          </div>
        </div>

        {/* Department */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Department (optional)
          </label>
          <select
            value={form.departmentId}
            onChange={(e) => handleChange('departmentId', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="none">No department assigned</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Description <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Short overview of what this program covers..."
          />
        </div>

        {/* Requirements & Features */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Admission Requirements
            </label>
            <textarea
              value={form.requirements}
              onChange={(e) => handleChange('requirements', e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., 5 O''Level credits including English and Mathematics..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Key Features{' '}
              <span className="text-gray-400 text-xs">
                (comma separated)
              </span>
            </label>
            <textarea
              value={form.features}
              onChange={(e) => handleChange('features', e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Clinical placement, Modern labs, Industry partnership"
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-gray-900">Program status</p>
            <p className="text-xs text-gray-600">
              Inactive programs will be hidden from student-facing flows.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange('isActive', !form.isActive)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              form.isActive
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-400 bg-slate-50 text-slate-700'
            }`}
          >
            <span
              className={`mr-1 h-2 w-2 rounded-full ${
                form.isActive ? 'bg-emerald-500' : 'bg-slate-400'
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
              Program Preview
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-emerald-700/80">Name:</span>
                <p className="font-semibold">{form.name}</p>
              </div>
              <div>
                <span className="text-emerald-700/80">Code:</span>
                <p className="font-semibold">{form.code.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-emerald-700/80">Type / Level:</span>
                <p className="font-semibold">
                  {
                    typeOptions.find((t) => t.value === form.type)?.label
                  }{' '}
                  ·{' '}
                  {
                    levelOptions.find((l) => l.value === form.level)?.label
                  }
                </p>
              </div>
              <div>
                <span className="text-emerald-700/80">Department:</span>
                <p className="font-semibold">
                  {form.departmentId === 'none'
                    ? 'None'
                    : departments.find((d) => d.id === form.departmentId)
                        ?.name ?? 'Unknown'}
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
            {submitting ? 'Creating...' : 'Add Program'}
          </PrimaryButton>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Local helper for select styling
function cnBaseSelect(hasError?: string) {
  return [
    'w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-all',
    hasError
      ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-transparent'
      : 'border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent',
  ].join(' ');
}
