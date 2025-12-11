"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/modals";
import { Input, Select } from "@/components/shared";
import { toast } from "react-toastify";

interface EditStaffModalProps {
  isOpen: boolean;
  staffId: string;
  onClose: () => void;
  onUpdated: () => void;
}

interface StaffProfile {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  state_of_origin: string | null;
  lga_of_origin: string | null;
  religion: string | null;
}

interface StaffData {
  designation: string | null;
  specialization: string | null;
  department_id: string | null;
  status: string;
  profiles: StaffProfile;
}

export function EditStaffModal({
  isOpen,
  staffId,
  onClose,
  onUpdated,
}: EditStaffModalProps) {
  const [data, setData] = useState<StaffData | null>(null);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  // ------------ LOAD STAFF ------------
  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      try {
        setLoading(true);

        // Load staff
        const res = await fetch(`/api/admin/staff/${staffId}`);
        if (!res.ok) throw new Error("Failed to load staff");

        const json = await res.json();
        setData(json.staff);

        // Load departments
        const dep = await fetch("/api/admin/departments");
        const depJson = await dep.json();
        setDepartments(depJson.departments || []);
      } catch (err) {
        toast.error("Failed to load staff");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, staffId]);

  // ------------ SAVE STAFF ------------
  async function save() {
    if (!data) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/admin/staff/${staffId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update staff");

      toast.success("Staff updated");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Edit Staff">
      {!data ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <div className="space-y-6">
          {/* NAME ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="First Name"
              value={data.profiles.first_name}
              onChange={(e) =>
                setData({
                  ...data,
                  profiles: { ...data.profiles, first_name: e.target.value },
                })
              }
            />
            <Input
              label="Middle Name"
              value={data.profiles.middle_name ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  profiles: { ...data.profiles, middle_name: e.target.value },
                })
              }
            />
            <Input
              label="Last Name"
              value={data.profiles.last_name}
              onChange={(e) =>
                setData({
                  ...data,
                  profiles: { ...data.profiles, last_name: e.target.value },
                })
              }
            />
          </div>

          {/* CONTACT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              value={data.profiles.email}
              onChange={(e) =>
                setData({
                  ...data,
                  profiles: { ...data.profiles, email: e.target.value },
                })
              }
            />
            <Input
              label="Phone"
              value={data.profiles.phone ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  profiles: { ...data.profiles, phone: e.target.value },
                })
              }
            />
          </div>

          {/* STAFF DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Designation"
              value={data.designation ?? ""}
              onChange={(e) =>
                setData({ ...data, designation: e.target.value })
              }
            />
            <Input
              label="Specialization"
              value={data.specialization ?? ""}
              onChange={(e) =>
                setData({ ...data, specialization: e.target.value })
              }
            />
          </div>

          {/* DEPARTMENT */}
          <Select
            label="Department"
            value={data.department_id ?? ""}
            onChange={(value) =>
              setData({ ...data, department_id: value as string })
            }
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            required
          />

          {/* STATUS */}
          <Select
            label="Status"
            value={data.status}
            onChange={(value) => setData({ ...data, status: value })}
            options={[
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "resigned", label: "Resigned" },
              { value: "retired", label: "Retired" },
            ]}
            required
          />

          {/* SAVE BUTTON */}
          <button
            onClick={save}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </Modal>
  );
}
