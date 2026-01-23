import { useState } from "react";
import { toast } from "react-toastify";
import StudentPicker from "./StudentPicker";
import { Button } from "@/components/ui/button";

type Props = {
  courseOfferingId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
};

export default function AddStudentModal({
  courseOfferingId,
  open,
  onClose,
  onAdded,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function save() {
    try {
      setSaving(true);
            const res = await fetch(`/api/exams/enrollments/${courseOfferingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selected }),
      });

      const json: { error?: string } = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json.error ?? "Enroll failed");
      toast.success("Students enrolled");
      onAdded();
      onClose();
    } catch {
      toast.error("Failed to enroll students");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add Students to Roster</h2>

        <StudentPicker
          courseOfferingId={courseOfferingId}
          selected={selected}
          onChange={setSelected}
        />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || selected.length === 0}
            className="bg-green-600 hover:bg-green-700"
            onClick={save}
          >
            Add Students
          </Button>
        </div>
      </div>
    </div>
  );
}
