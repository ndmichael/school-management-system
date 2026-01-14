"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/* ================= TYPES ================= */

export type ProgramItem = {
  id: string;
  name: string;
};

export type CourseOfferingDetails = {
  course_offering_id: string;
  course_code: string;
  course_title: string;
  credits: number;
  session_name: string;
  session_active: boolean;
  semester: string;

  // ✅ M2M programs list (empty => All)
  programs: ProgramItem[];

  level: string | null;
  is_published: boolean;
  eligible_students: number;
  submitted_results: number;
  pending_results: number;
  assigned_staff: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  offering: CourseOfferingDetails | null;
  showAdminActions?: boolean;
};

/* ================= HELPERS (NO any) ================= */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function toNumber(v: unknown): number {
  if (isNumber(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return 0;
}

function toBool(v: unknown): boolean {
  if (isBoolean(v)) return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return false;
}

function parseProgramItem(v: unknown): ProgramItem | null {
  if (!isRecord(v)) return null;
  const id = v.id;
  const name = v.name;
  if (!isString(id) || !isString(name)) return null;
  return { id, name };
}

function parseOffering(v: unknown): CourseOfferingDetails | null {
  if (!isRecord(v)) return null;

  const course_offering_id = v.course_offering_id;
  const course_code = v.course_code;
  const course_title = v.course_title;
  const session_name = v.session_name;
  const semester = v.semester;

  if (!isString(course_offering_id)) return null;
  if (!isString(course_code)) return null;
  if (!isString(course_title)) return null;
  if (!isString(session_name)) return null;
  if (!isString(semester)) return null;

  const programsRaw = v.programs;
  const programs: ProgramItem[] = Array.isArray(programsRaw)
    ? programsRaw.map(parseProgramItem).filter((p): p is ProgramItem => p !== null)
    : [];

  const levelRaw = v.level;

  return {
    course_offering_id,
    course_code,
    course_title,
    credits: toNumber(v.credits),
    session_name,
    session_active: toBool(v.session_active),
    semester,
    programs,
    level: isString(levelRaw) ? levelRaw : null,
    is_published: toBool(v.is_published),
    eligible_students: toNumber(v.eligible_students),
    submitted_results: toNumber(v.submitted_results),
    pending_results: toNumber(v.pending_results),
    assigned_staff: toNumber(v.assigned_staff),
  };
}

/* ================= COMPONENT ================= */

export default function CourseOfferingDetailsModal({
  open,
  onClose,
  offering,
  showAdminActions = false,
}: Props) {
  const [fresh, setFresh] = useState<CourseOfferingDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const offeringId = offering?.course_offering_id ?? "";
  const view: CourseOfferingDetails | null = fresh ?? offering;

  // Close on ESC
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Fetch latest row when modal opens
  useEffect(() => {
    if (!open || !offeringId) return;

    let cancelled = false;

    async function loadFresh() {
      setLoading(true);

      try {
        const res = await fetch("/api/admin/course-offerings", { cache: "no-store" });
        const json: unknown = await res.json().catch(() => null);

        if (!res.ok || !Array.isArray(json)) {
          if (!cancelled) setFresh(offering);
          return;
        }

        const parsed = json.map(parseOffering).filter((x): x is CourseOfferingDetails => x !== null);
        const found = parsed.find((r) => r.course_offering_id === offeringId) ?? null;

        if (!cancelled) setFresh(found ?? offering);
      } catch {
        if (!cancelled) setFresh(offering);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFresh();

    return () => {
      cancelled = true;
    };
  }, [open, offeringId, offering]);

  if (!open || !view) return null;

  const programSummary =
    view.programs.length === 0 ? "All Programs" : `${view.programs.length} selected`;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
      />

      {/* Modal wrapper */}
      <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
        {/* Card (flex column + max height) */}
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 p-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {view.course_code} — {view.course_title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Session: {view.session_name} • Semester: {view.semester} • Credits: {view.credits}
              </p>
              {loading ? <p className="mt-1 text-xs text-gray-500">Updating…</p> : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Body (ONLY this scrolls) */}
          <div className="p-5 text-sm text-gray-800 overflow-y-auto">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-gray-500">Published</div>
                  <div className="font-semibold">{view.is_published ? "Yes" : "No"}</div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-gray-500">Session Active</div>
                  <div className="font-semibold">{view.session_active ? "Yes" : "No"}</div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-gray-500">Programs</div>
                  <div className="font-semibold">{programSummary}</div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-gray-500">Level</div>
                  <div className="font-semibold">{view.level ?? "All"}</div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-gray-500">Eligible Students</div>
                  <div className="font-semibold">{view.eligible_students}</div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-gray-500">Submitted / Pending</div>
                  <div className="font-semibold">
                    {view.submitted_results} / {view.pending_results}
                  </div>
                </div>

                <div className="col-span-2 rounded-lg border border-gray-200 p-3">
                  <div className="text-gray-500">Assigned Staff</div>
                  <div className="font-semibold">{view.assigned_staff}</div>
                </div>
              </div>

              {/* Full program list */}
              {view.programs.length > 0 ? (
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 text-gray-500">Selected Programs</div>
                  <div className="flex flex-wrap gap-2">
                    {view.programs.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer (always visible) */}
          <div className="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 p-5 bg-white">
            {showAdminActions ? (
              <>
                <Link
                  href={`/dashboard/admin/course-offerings/${view.course_offering_id}/edit`}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Edit
                </Link>

                <Link
                  href={`/dashboard/admin/course-offerings/${view.course_offering_id}/assign-staff`}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Assign Staff
                </Link>
              </>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
