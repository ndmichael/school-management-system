'use client';

import * as React from 'react';
import { toast } from 'react-toastify';
import { Input, Select, Textarea } from '@/components/shared';

export type DepartmentOption = { id: string; name: string };

type CourseRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number;
  department_id: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;

  // ✅ passed from server page (no client fetch needed)
  departments: ReadonlyArray<DepartmentOption>;
  course?: CourseRow | null; // ✅ when present => edit mode
};

type CoursePayload = {
  code: string;
  title: string;
  description: string | null;
  credits: number;
  department_id: string | null;
};

type ApiErrorShape = { error?: string; message?: string };

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const ct = res.headers.get('content-type') ?? '';
  const isJson = ct.includes('application/json');
  const body: unknown = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '');

  if (!res.ok) {
    const maybeObj =
      typeof body === 'object' && body !== null ? (body as ApiErrorShape) : null;
    const msg =
      maybeObj?.error ||
      maybeObj?.message ||
      (typeof body === 'string' && body.trim() ? body.slice(0, 220) : '') ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return body as T;
}

function toSelectOptions(
  items: ReadonlyArray<{ id: string; name: string }>
): ReadonlyArray<{ value: string; label: string }> {
  return items.map((x) => ({ value: x.id, label: x.name }));
}

function XIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? 'h-5 w-5'}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function AddCourseModal({
  open,
  onClose,
  onCreated,
  departments,
  course,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);

  const [code, setCode] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [credits, setCredits] = React.useState<number>(3);
  const [departmentId, setDepartmentId] = React.useState<string>('');

  const isEditing = Boolean(course?.id);

  // ✅ Prefill when editing; reset when creating
  React.useEffect(() => {
    if (!open) return;

    if (course) {
      setCode(course.code ?? '');
      setTitle(course.title ?? '');
      setDescription(course.description ?? '');
      setCredits(typeof course.credits === 'number' ? course.credits : 3);
      setDepartmentId(course.department_id ?? '');
    } else {
      setCode('');
      setTitle('');
      setDescription('');
      setCredits(3);
      setDepartmentId('');
    }
  }, [open, course]);

  const canSubmit =
    code.trim().length > 0 &&
    title.trim().length > 0 &&
    Number.isFinite(credits) &&
    credits > 0;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) {
      toast.error('Course code, title and credits are required.');
      return;
    }

    const payload: CoursePayload = {
      code: code.trim(),
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      credits: Number(credits),
      department_id: departmentId || null,
    };

    try {
      setSubmitting(true);

      if (isEditing && course?.id) {
        await fetchJSON<CourseRow>(`/api/admin/courses/${course.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Course updated');
      } else {
        await fetchJSON<{ id: string }>('/api/admin/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Course created');
      }

      onCreated?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save course';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const departmentOptions = toSelectOptions(departments);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? 'Edit course' : 'Add course'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEditing
                ? 'Update course details.'
                : 'Create a course and optionally assign department.'}
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 disabled:opacity-60"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Course code"
            required
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCode(e.target.value)
            }
            placeholder="e.g. PHY101"
          />

          <Input
            label="Credits"
            required
            type="number"
            min={1}
            value={credits}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCredits(Number(e.target.value))
            }
          />

          <div className="md:col-span-2">
            <Input
              label="Title"
              required
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              placeholder="Course title"
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Optional"
            />
          </div>

          <Select
            label="Department"
            value={departmentId}
            onChange={(value: string | '') => setDepartmentId(value)}
            options={departmentOptions}
          />

          <div className="md:col-span-2 mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Saving…' : isEditing ? 'Update course' : 'Add course'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
