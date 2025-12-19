'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Modal } from './Modal';
import { staffData } from '@/data/admin';
import { Calendar, Search, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { AdminPrimaryButton } from '@/components/shared/AdminPrimaryButton';
import { Input } from '@/components/shared/Input';
import { createClient } from '@/lib/supabase/client';

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


interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (dept: DepartmentRow) => void;
}

interface FormData {
  name: string;
  code: string;
  hod: string;
  established: string;
}

interface FormErrors {
  name?: string;
  code?: string;
  hod?: string;
  established?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const SearchableHODSelect = ({ value, onChange, error }: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const academicStaff = staffData.filter((staff) => staff.role === 'Academic Staff');

  const filteredStaff = academicStaff.filter((staff) =>
    [staff.name, staff.id, staff.department, staff.position]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const selectedStaff = academicStaff.find((s) => s.id === value);

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
        Head of Department <span className="text-destructive">*</span>
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={[
            'flex w-full items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm',
            'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-600 focus-visible:ring-offset-1',
            error ? 'border-destructive/70 bg-destructive/5' : 'border-input hover:bg-muted/50',
          ].join(' ')}
        >
          {selectedStaff ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                <Image
                  src={selectedStaff.avatar}
                  alt={selectedStaff.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {selectedStaff.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {selectedStaff.position}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Search and select HOD</span>
          )}
          <Search className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/5" onClick={() => setIsOpen(false)} />
            <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              <div className="sticky top-0 border-b border-border bg-card px-3 py-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, position, or department..."
                    className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-admin-600"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto bg-card">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        onChange(staff.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={[
                        'flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left text-sm bg-card',
                        'last:border-b-0 hover:bg-muted/60',
                      ].join(' ')}
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={staff.avatar}
                          alt={staff.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {staff.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {staff.position}
                        </div>
                        <div className="text-[11px] text-muted-foreground/80">
                          {staff.department}
                        </div>
                      </div>
                      {staff.id === value && (
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="font-medium">No staff found</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try a different search term.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
};

export function AddDepartmentModal({ isOpen, onClose, onCreated }: AddDepartmentModalProps) {
  const supabase = createClient();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    hod: '',
    established: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Department name is required';
    else if (formData.name.trim().length < 3) newErrors.name = 'Department name must be at least 3 characters';

    if (!formData.code.trim()) newErrors.code = 'Department code is required';
    else if (formData.code.length < 2 || formData.code.length > 5) newErrors.code = 'Code must be between 2–5 characters';

    if (!formData.hod) newErrors.hod = 'Head of Department is required';

    if (!formData.established) newErrors.established = 'Establishment year is required';
    else {
      const year = parseInt(formData.established, 10);
      if (Number.isNaN(year)) newErrors.established = 'Enter a valid year';
      else if (year < 1900 || year > currentYear) newErrors.established = `Year must be between 1900 and ${currentYear}`;
    }

    return newErrors;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    // ✅ Insert into Supabase — FIXED: use is_active instead of status
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: formData.name.trim(),
        code: formData.code.toUpperCase().trim(),
        is_active: true,
        // Add only if your table has them:
        // hod_profile_id: formData.hod,
        // established_year: parseInt(formData.established, 10),
      })
      .select('id, code, name, description, is_active, created_at')
      .single<DepartmentRow>();

    setSubmitting(false);

    if (error) {
      console.error(error);
      return;
    }

    if (!data) {
      return;
    }

    onCreated(data);

    setFormData({ name: '', code: '', hod: '', established: '' });
    setErrors({});
    onClose();
  };

  const previewReady =
    formData.name &&
    formData.code &&
    formData.hod &&
    formData.established &&
    Object.keys(errors).length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Department" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Banner — admin red */}
        <div className="flex gap-3 rounded-xl border border-admin-600/15 bg-admin-600/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-admin-600" />
          <div className="text-xs text-muted-foreground">
            <p className="mb-1 text-sm font-semibold text-foreground">Department guidelines</p>
            <p>
              Only academic staff can be assigned as Head of Department. Codes must be unique and typically 3–5
              characters.
            </p>
          </div>
        </div>

        {/* Name + Code */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Department Name"
            required
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Medical Laboratory Science"
            error={errors.name}
          />

          <div className="space-y-1.5">
            <Input
              label="Department Code"
              required
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              placeholder="e.g., MLS"
              maxLength={5}
              className="uppercase"
              error={errors.code}
            />
            {formData.code && !errors.code && (
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" />
                Code: {formData.code.toUpperCase()}
              </p>
            )}
          </div>
        </div>

        {/* HOD Selection */}
        <SearchableHODSelect
          value={formData.hod}
          onChange={(value) => handleInputChange('hod', value)}
          error={errors.hod}
        />

        {/* Year established */}
        <div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Year Established <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                value={formData.established}
                onChange={(e) => handleInputChange('established', e.target.value)}
                placeholder={`e.g., ${currentYear - 10}`}
                min={1900}
                max={currentYear}
                className={[
                  'h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm text-foreground',
                  'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-admin-600 focus-visible:ring-offset-1',
                  errors.established ? 'border-destructive/70 bg-destructive/5' : 'border-input',
                ].join(' ')}
              />
            </div>
          </div>
          {errors.established && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.established}
            </p>
          )}
        </div>

        {/* Preview */}
        {previewReady && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle className="h-4 w-4" />
              Department preview
            </h4>
            <div className="grid gap-3 text-xs text-foreground sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-semibold">{formData.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Code:</span>
                <p className="font-semibold">{formData.code.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">HOD:</span>
                <p className="font-semibold">{staffData.find((s) => s.id === formData.hod)?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Established:</span>
                <p className="font-semibold">{formData.established}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 border-t border-border pt-4">
          <AdminPrimaryButton type="submit" disabled={submitting} className="flex-1" loading={submitting}>
            Add Department
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
