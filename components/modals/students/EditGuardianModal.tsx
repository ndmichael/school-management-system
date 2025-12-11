'use client';

import { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { toast } from "react-toastify";

interface Guardian {
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_status: string | null;
}

interface Props {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditGuardianModal({ studentId, isOpen, onClose, onUpdated }: Props) {
  const [data, setData] = useState<Guardian | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/admin/students/${studentId}/guardian`);

        if (!res.ok) throw new Error("Failed to load guardian info");

        const json = await res.json();

        if (active) setData(json.guardian);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [isOpen, studentId]);

  async function save() {
    if (!data) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/admin/students/${studentId}/guardian`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update guardian");

      toast.success("Guardian info updated");
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Guardian Info" size="md">
      {!data ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">First Name</label>
            <input
              className="w-full border rounded p-2 mt-1"
              value={data.guardian_first_name ?? ""}
              onChange={(e) =>
                setData({ ...data, guardian_first_name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Last Name</label>
            <input
              className="w-full border rounded p-2 mt-1"
              value={data.guardian_last_name ?? ""}
              onChange={(e) =>
                setData({ ...data, guardian_last_name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              className="w-full border rounded p-2 mt-1"
              value={data.guardian_phone ?? ""}
              onChange={(e) =>
                setData({ ...data, guardian_phone: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Relationship</label>
            <input
              className="w-full border rounded p-2 mt-1"
              value={data.guardian_status ?? ""}
              onChange={(e) =>
                setData({ ...data, guardian_status: e.target.value })
              }
            />
          </div>

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
