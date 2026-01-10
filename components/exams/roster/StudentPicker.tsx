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

export default function StudentPicker({
  courseOfferingId,
  selected,
  onChange,
}: Props) {
  const [students, setStudents] = useState<EligibleStudent[]>([]);

  useEffect(() => {
    async function loadStudents() {
      const res = await fetch(
        `/api/exams/eligible-students/${courseOfferingId}`,
        { cache: "no-store" }
      );

      if (!res.ok) return;

      const json: { students: EligibleStudent[] } = await res.json();
      setStudents(json.students ?? []);
    }

    loadStudents();
  }, [courseOfferingId]);

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
      {students.map((s) => (
        <label
          key={s.id}
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
        >
          <input
            type="checkbox"
            checked={selected.includes(s.id)}
            onChange={() => toggle(s.id)}
          />
          <span className="text-sm">
            {s.profiles.first_name} {s.profiles.last_name} — {s.matric_no}
          </span>
        </label>
      ))}
    </div>
  );
}
