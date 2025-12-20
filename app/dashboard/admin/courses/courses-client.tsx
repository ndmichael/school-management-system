'use client';

import * as React from 'react';
import { toast } from 'react-toastify';
import AddCourseModal, { DepartmentOption } from '@/components/modals/AddCourseModal';

type CourseRow = {
  id: string;
  code: string;
  title: string;
  description: string | null; // ✅ FIX: match AddCourseModal expectation
  credits: number;
  department_id: string | null;
};

type ListResponse<T> = T[] | { data: T[] };

function unwrapList<T>(x: ListResponse<T>): T[] {
  if (Array.isArray(x)) return x;
  if (x && typeof x === 'object' && 'data' in x && Array.isArray(x.data)) {
    return x.data;
  }
  return [];
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      (body && typeof body === 'object' && 'error' in body && String(body.error)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return body as T;
}

/* ---------- Icons ---------- */

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/* ---------- Component ---------- */

type Props = {
  departments: ReadonlyArray<DepartmentOption>;
};

export default function CoursesClient({ departments }: Props) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CourseRow | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [courses, setCourses] = React.useState<CourseRow[]>([]);

  const departmentMap = React.useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  async function loadCourses(): Promise<void> {
    try {
      setLoading(true);

      // ✅ IMPORTANT: /api/admin/courses must return `description`
      const res = await fetchJSON<ListResponse<CourseRow>>('/api/admin/courses');
      setCourses(unwrapList(res));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadCourses();
  }, []);

  async function handleDelete(row: CourseRow): Promise<void> {
    if (!window.confirm(`Delete "${row.code} — ${row.title}"?`)) return;

    const prev = courses;
    setCourses((c) => c.filter((x) => x.id !== row.id));

    try {
      await fetchJSON(`/api/admin/courses/${row.id}`, { method: 'DELETE' });
      toast.success('Course deleted');
    } catch (e) {
      setCourses(prev);
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">Create, edit, and delete courses.</p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add course
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white">
        {loading ? (
          <div className="p-4 text-sm">Loading…</div>
        ) : courses.length === 0 ? (
          <div className="p-4 text-sm">No courses found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{c.code}</td>
                  <td className="px-4 py-3">{c.title}</td>
                  <td className="px-4 py-3">{c.credits}</td>
                  <td className="px-4 py-3">
                    {c.department_id ? departmentMap.get(c.department_id) ?? '—' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                        title="Edit"
                      >
                        <EditIcon />
                      </button>

                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
                        onClick={() => void handleDelete(c)}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <AddCourseModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onCreated={loadCourses}
        departments={departments}
        course={editing}
      />
    </div>
  );
}
