import { useEffect, useState } from "react";

type StudentProfile = {
  first_name: string;
  last_name: string;
};

type EligibleStudent = {
  id: string;
  matric_no: string;
  profiles: StudentProfile;
};

type Props = {
  courseOfferingId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
};

export default function StudentPicker({ courseOfferingId, selected, onChange }: Props) {
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/exams/eligible-students/${courseOfferingId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setError(`Failed to load students (${res.status}).`);
          return;
        }

        const json: { students: EligibleStudent[] } = await res.json();
        if (!cancelled) setStudents(json.students ?? []);
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, [courseOfferingId]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  if (loading) {
    return (
      <div className="max-h-80 overflow-y-auto border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-sm border" />
          <div className="h-4 w-56 animate-pulse bg-gray-200 rounded" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-4 w-4 rounded-sm border" />
          <div className="h-4 w-72 animate-pulse bg-gray-200 rounded" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-4 w-4 rounded-sm border" />
          <div className="h-4 w-64 animate-pulse bg-gray-200 rounded" />
        </div>
        <p className="mt-4 text-xs text-gray-500">Loading eligible students…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-h-80 overflow-y-auto border rounded-lg p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
      {students.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">No eligible students found.</div>
      ) : (
        students.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
          >
            <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
            <span className="text-sm">
              {s.profiles.first_name} {s.profiles.last_name} — {s.matric_no}
            </span>
          </label>
        ))
      )}
    </div>
  );
}
