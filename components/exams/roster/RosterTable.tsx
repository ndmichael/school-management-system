"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import RemoveEnrollmentButton from "./RemoveEnrollmentButton";

type StudentProfile = {
  first_name: string;
  last_name: string;
};

type StudentProgram = { name: string } | null;

type EnrolledStudent = {
  id: string;
  matric_no: string;
  level: string | null;
  program: StudentProgram;
  profiles: StudentProfile;
};

type Enrollment = {
  id: string;
  students: EnrolledStudent;
};

type Props = {
  loading: boolean;
  enrollments: Enrollment[];
  onRemoved: () => void;
  offeringId: string;
};

export default function RosterTable({ loading, enrollments, onRemoved, offeringId }: Props) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);


  const allStudentIds = useMemo(
    () =>
      enrollments
        .map((e) => e.students.id)
        .filter((id) => typeof id === "string" && id.length > 0 && id !== "undefined"),
    [enrollments]
  );

  const allSelected = allStudentIds.length > 0 && selectedStudentIds.length === allStudentIds.length;

  function toggleOne(studentId: string) {
    if (!studentId || studentId === "undefined") return;
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((x) => x !== studentId) : [...prev, studentId]
    );
  }

  function toggleAll() {
    setSelectedStudentIds(allSelected ? [] : allStudentIds);
  }

  async function removeSelected() {
    if (!offeringId || offeringId === "undefined") {
      toast.error("Course offering id is missing");
      return;
    }

    const ids = selectedStudentIds.filter((x) => x && x !== "undefined");
    if (ids.length === 0) return;

    if (!confirm(`Remove ${ids.length} student(s) from roster?`)) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/exams/enrollments/${offeringId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: ids }),
      });

      const json: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to remove selected students");

      toast.success("Selected students removed");
      setSelectedStudentIds([]);
      onRemoved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove selected students");
    } finally {
      setDeleting(false);
    }
  }


  if (loading) return <div className="text-gray-500">Loading roster…</div>;
  if (enrollments.length === 0) return <div className="text-gray-500">No students enrolled</div>;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b bg-gray-50">
        <div className="text-sm text-gray-700">
          Selected: <span className="font-medium">{selectedStudentIds.length}</span>
        </div>

        <button
          type="button"
          onClick={removeSelected}
          disabled={selectedStudentIds.length === 0 || deleting}
          className="px-3 py-2 rounded-lg text-sm font-medium
                    bg-admin-600 text-white hover:bg-admin-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    inline-flex items-center gap-2"
        >
          {deleting && (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          )}
          {deleting ? "Removing..." : "Remove Selected"}
        </button>

      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-4 text-left w-12">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            </th>
            <th className="px-6 py-4 text-left">Student</th>
            <th className="px-6 py-4 text-center">Matric No</th>
            <th className="px-6 py-4 text-center">Program</th>
            <th className="px-6 py-4 text-center">Level</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {enrollments.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(e.students.id)}
                  onChange={() => toggleOne(e.students.id)}
                />
              </td>

              <td className="px-6 py-4 font-medium">
                {e.students.profiles.first_name} {e.students.profiles.last_name}
              </td>

              <td className="px-6 py-4 text-center">{e.students.matric_no}</td>

              <td className="px-6 py-4 text-center">{e.students.program?.name ?? "-"}</td>

              <td className="px-6 py-4 text-center">{e.students.level ?? ""}</td>

              <td className="px-6 py-4 text-right">
                <RemoveEnrollmentButton enrollmentId={e.id} onRemoved={onRemoved} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
