'use client';

import { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { toast } from "react-toastify";

interface Academic {
  program_id: string | null;
  department_id: string | null;
  level: string | null;
  course_session_id: string | null;
  status: string | null;
}

interface Props {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditAcademicModal({ studentId, isOpen, onClose, onUpdated }: Props) {
  const [data, setData] = useState<Academic | null>(null);
  const [loading, setLoading] = useState(false);

  // ---------------- LOAD ACADEMIC INFO ----------------
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/admin/students/${studentId}/academic`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load academic data");

        const json: { academic: Academic } = await res.json();

        if (active) setData(json.academic);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [isOpen, studentId]);

  // ---------------- SAVE ACADEMIC INFO ----------------
  async function save() {
    if (!data) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/admin/students/${studentId}/academic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update academic info");

      toast.success("Academic info updated successfully");
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  // ---------------- UI ----------------
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Academic Info" size="lg">
      {!data ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <div className="space-y-4">

          {/* LEVEL */}
          <div>
            <label className="text-sm font-medium">Level</label>
            <input
              className="w-full mt-1 border rounded p-2"
              value={data.level ?? ""}
              onChange={(e) => setData({ ...data, level: e.target.value })}
            />
          </div>

          {/* STATUS */}
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full mt-1 border rounded p-2"
              value={data.status ?? ""}
              onChange={(e) => setData({ ...data, status: e.target.value })}
            >
              <option value="">Select status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={save}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </Modal>
  );
}
