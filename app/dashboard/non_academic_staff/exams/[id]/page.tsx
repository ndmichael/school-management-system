import type { Enrollment } from "@/types/exams";
import RemoveEnrollmentButton from "@/components/exams/roster/RemoveEnrollmentButton";

type Props = {
  loading: boolean;
  enrollments: Enrollment[];
  onRemoved: () => void;
};

export default function RosterTable({
  loading,
  enrollments,
  onRemoved,
}: Props) {
  if (loading) return <div className="text-gray-500">Loading roster…</div>;

  if (enrollments.length === 0)
    return <div className="text-gray-500">No students enrolled</div>;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-4 text-left">Student</th>
            <th className="px-6 py-4">Matric No</th>
            <th className="px-6 py-4">Program</th>
            <th className="px-6 py-4">Level</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {enrollments.map((e) => (
            <tr key={e.id}>
              <td className="px-6 py-4 font-medium">
                {e.students.profiles.first_name}{" "}
                {e.students.profiles.last_name}
              </td>
              <td className="px-6 py-4 text-center">
                {e.students.matric_no}
              </td>
              <td className="px-6 py-4 text-center">
                {e.students.program?.name ?? "-"}
              </td>
              <td className="px-6 py-4 text-center">
                {e.students.level ?? "-"}
              </td>
              <td className="px-6 py-4 text-right">
                <RemoveEnrollmentButton
                  enrollmentId={e.id}
                  onRemoved={onRemoved}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
