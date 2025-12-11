'use client';

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Input, Select } from "@/components/shared";
import { toast } from "react-toastify";

interface Department {
  id: string;
  name: string;
}

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddStaffModal({ isOpen, onClose, onCreated }: AddStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    nin: "",
    address: "",
    state_of_origin: "",
    lga_of_origin: "",
    religion: "islam",

    main_role: "academic_staff", // backend expects academic_staff | non_academic_staff
    designation: "",
    specialization: "",
    department_id: "",
    hire_date: "",
  });

  // -------------------------------
  // LOAD DEPARTMENTS FROM BACKEND
  // -------------------------------
  useEffect(() => {
    async function loadDepartments() {
      const res = await fetch("/api/admin/departments");
      const json = await res.json();

      if (res.ok) {
        setDepartments(json.departments || []);
      } else {
        toast.error("Failed to load departments");
      }
    }

    if (isOpen) loadDepartments();
  }, [isOpen]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.department_id) {
      toast.error("Please select a department");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to create staff");
        return;
      }

      toast.success("Staff created successfully");
      onCreated();
      onClose();
    } catch (err) {
      toast.error("Unexpected error creating staff");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Staff" size="xl">
      <form onSubmit={submit} className="space-y-6">

        {/* NAME ROW — 3 COLUMNS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="First Name"
            required
            placeholder="John"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />
          <Input
            label="Middle Name"
            placeholder="A."
            value={form.middle_name}
            onChange={(e) => update("middle_name", e.target.value)}
          />
          <Input
            label="Last Name"
            required
            placeholder="Doe"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
          />
        </div>

        {/* EMAIL + PHONE */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Email"
            required
            placeholder="john.doe@school.edu.ng"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <Input
            label="Phone Number"
            required
            placeholder="+234 800 000 0000"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>

        {/* GENDER + DOB */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Gender"
            required
            value={form.gender}
            onChange={(v) => update("gender", v)}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
          <Input
            label="Date of Birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => update("date_of_birth", e.target.value)}
          />
        </div>

        {/* ID & ADDRESS */}
        <Input
          label="National ID (NIN)"
          placeholder="1234-5678-9012"
          value={form.nin}
          onChange={(e) => update("nin", e.target.value)}
        />

        <Input
          label="Home Address"
          placeholder="Kaduna, Nigeria"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
        />

        {/* ORIGIN + RELIGION */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="State of Origin"
            placeholder="Kaduna"
            value={form.state_of_origin}
            onChange={(e) => update("state_of_origin", e.target.value)}
          />

          <Input
            label="LGA of Origin"
            placeholder="Zaria"
            value={form.lga_of_origin}
            onChange={(e) => update("lga_of_origin", e.target.value)}
          />

          <Select
            label="Religion"
            value={form.religion}
            onChange={(v) => update("religion", v)}
            options={[
              { value: "islam", label: "Islam" },
              { value: "christianity", label: "Christianity" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>

        {/* MAIN ROLE */}
        <Select
          label="Staff Type"
          required
          value={form.main_role}
          onChange={(v) => update("main_role", v)}
          options={[
            { value: "academic_staff", label: "Academic Staff" },
            { value: "non_academic_staff", label: "Non-Academic Staff" },
          ]}
        />

        {/* STAFF DETAILS */}
        <Input
          label="Designation"
          required
          placeholder="Senior Lecturer / Admin Officer"
          value={form.designation}
          onChange={(e) => update("designation", e.target.value)}
        />

        <Input
          label="Specialization"
          placeholder="Chemistry, HR, Laboratory Science..."
          value={form.specialization}
          onChange={(e) => update("specialization", e.target.value)}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Hire Date"
            required
            type="date"
            value={form.hire_date}
            onChange={(e) => update("hire_date", e.target.value)}
          />

          <Select
            label="Department"
            required
            value={form.department_id}
            onChange={(v) => update("department_id", v)}
            options={departments.map((d) => ({
              value: d.id,
              label: d.name,
            }))}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-60"
          >
            {loading ? "Creating..." : "Add Staff"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
