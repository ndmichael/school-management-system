import { XCircle } from "lucide-react";
import { toast } from "react-toastify";

type Props = {
  enrollmentId: string;
  onRemoved: () => void;
};

export default function RemoveEnrollmentButton({ enrollmentId, onRemoved }: Props) {
  async function remove() {
    if (!confirm("Remove this student from roster?")) return;

    try {
      const res = await fetch("/api/exams/enrollments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollment_id: enrollmentId }),
      });

      const json: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to remove student");

      toast.success("Student removed");
      onRemoved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove student");
    }
  }

  return (
    <button onClick={remove} className="p-2 rounded-lg hover:bg-red-100">
      <XCircle className="w-4 h-4 text-red-600" />
    </button>
  );
}
