import { XCircle } from "lucide-react";
import { toast } from "react-toastify";

export default function RemoveEnrollmentButton({
  enrollmentId,
  onRemoved,
}: {
  enrollmentId: string;
  onRemoved: () => void;
}) {
  async function remove() {
    if (!confirm("Remove this student from roster?")) return;

    const res = await fetch(`/api/exams/enrollments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollment_id: enrollmentId }),
    });

    if (!res.ok) return toast.error("Failed to remove student");

    toast.success("Student removed");
    onRemoved();
  }

  return (
    <button
      onClick={remove}
      className="p-2 rounded-lg hover:bg-red-100"
    >
      <XCircle className="w-4 h-4 text-red-600" />
    </button>
  );
}
