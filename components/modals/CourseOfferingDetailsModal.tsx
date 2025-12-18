"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export type CourseOfferingDetails = {
  course_offering_id: string;
  course_code: string;
  course_title: string;
  credits: number;
  session_name: string;
  session_active: boolean;
  semester: string;
  program_id: string | null;
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
  // Optional: show admin actions only in admin screens
  showAdminActions?: boolean;
};

export default function CourseOfferingDetailsModal({
  open,
  onClose,
  offering,
  showAdminActions = false,
}: Props) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !offering) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-gray-200 p-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {offering.course_code} — {offering.course_title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Session: {offering.session_name} • Semester: {offering.semester} • Credits: {offering.credits}
              </p>
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

          <div className="p-5 space-y-3 text-sm text-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">Published</div>
                <div className="font-semibold">
                  {offering.is_published ? "Yes" : "No"}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">Session Active</div>
                <div className="font-semibold">
                  {offering.session_active ? "Yes" : "No"}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">Program</div>
                <div className="font-semibold">
                  {offering.program_id ? "Specific" : "All"}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">Level</div>
                <div className="font-semibold">
                  {offering.level ?? "All"}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">Eligible Students</div>
                <div className="font-semibold">{offering.eligible_students}</div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">Submitted / Pending</div>
                <div className="font-semibold">
                  {offering.submitted_results} / {offering.pending_results}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 col-span-2">
                <div className="text-gray-500">Assigned Staff</div>
                <div className="font-semibold">{offering.assigned_staff}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-5">
            {showAdminActions && (
              <Link
                href={`/dashboard/admin/course-offerings/${offering.course_offering_id}/assign-staff`}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Assign Staff
              </Link>
            )}

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
