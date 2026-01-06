"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { Input, Select } from "@/components/shared";
import { toast } from "react-toastify";

type MainRole = "academic_staff" | "non_academic_staff";
type StaffUnit = "admissions" | "bursary" | "exams";
type Religion = "islam" | "christianity" | "other";
type Gender = "male" | "female";

interface Department {
  id: string;
  name: string;
}

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type StaffFormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: "" | Gender;
  date_of_birth: string;
  nin: string;
  address: string;
  state_of_origin: string;
  lga_of_origin: string;
  religion: Religion;

  main_role: MainRole;
  unit: "" | StaffUnit; // ✅ NEW

  designation: string;
  specialization: string;
  department_id: string;
  hire_date: string;
};

const UNIT_OPTIONS: Array<{ value: StaffUnit; label: string }> = [
  { value: "admissions", label: "Admissions" },
  { value: "bursary", label: "Bursary" },
  { value: "exams", label: "Exams" },
];

export function AddStaffModal({ isOpen, onClose, onCreated }: AddStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [form, setForm] = useState<StaffFormState>({
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

    main_role: "academic_staff",
    unit: "",

    designation: "",
    specialization: "",
    department_id: "",
    hire_date: "",
  });

  // Reset unit if they switch away from non-academic
  useEffect(() => {
    if (form.main_role !== "non_academic_staff" && form.unit) {
      setForm((p) => ({ ...p, unit: "" }));
    }
  }, [form.main_role, form.unit]);

  // Load departments on open
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    async function loadDepartments() {
      try {
        const res = await fetch("/api/admin/departments", { signal: controller.signal });
        const json = (await res.json().catch(() => ({}))) as { departments?: Department[]; error?: string };

        if (!res.ok) throw new Error(json.error ?? "Failed to load departments");
        setDepartments(json.departments ?? []);
      } catch (e) {
        if (controller.signal.aborted) return;
        toast.error(e instanceof Error ? e.message : "Failed to load departments");
      }
    }

    loadDepartments();

    return () => controller.abort();
  }, [isOpen]);

  const update = <K extends keyof StaffFormState>(field: K, value: StaffFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const unitIsRequired = useMemo(() => form.main_role === "non_academic_staff", [form.main_role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.department_id) {
      toast.error("Please select a department");
      return;
    }

    if (unitIsRequired && !form.unit) {
      toast.error("Please select a unit for Non-Academic Staff");
      return;
    }

    // ✅ Production-friendly payload: optional fields become null (not empty strings)
    const payload = {
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() ? form.middle_name.trim() : null,
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() ? form.phone.trim() : null,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      nin: form.nin.trim() ? form.nin.trim() : null,
      address: form.address.trim() ? form.address.trim() : null,
      state_of_origin: form.state_of_origin.trim() ? form.state_of_origin.trim() : null,
      lga_of_origin: form.lga_of_origin.trim() ? form.lga_of_origin.trim() : null,
      religion: form.religion,

      main_role: form.main_role,
      unit: form.main_role === "non_academic_staff" ? form.unit : null, // ✅ only send when needed

      designation: form.designation.trim() ? form.designation.trim() : null,
      specialization: form.specialization.trim() ? form.specialization.trim() : null,
      department_id: form.department_id || null,
      hire_date: form.hire_date || null,
    };

    try {
      setLoading(true);

      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        toast.error(json.error || "Failed to create staff");
        return;
      }

      toast.success("Staff created successfully");
      onCreated();
      onClose();
    } catch {
      toast.error("Unexpected error creating staff");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Staff" size="xl">
      <form onSubmit={submit} className="space-y-6">
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

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Gender"
            required
            value={form.gender}
            onChange={(v) => update("gender", v as Gender)}
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
            onChange={(v) => update("religion", v as Religion)}
            options={[
              { value: "islam", label: "Islam" },
              { value: "christianity", label: "Christianity" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>

        <Select
          label="Staff Type"
          required
          value={form.main_role}
          onChange={(v) => update("main_role", v as MainRole)}
          options={[
            { value: "academic_staff", label: "Academic Staff" },
            { value: "non_academic_staff", label: "Non-Academic Staff" },
          ]}
        />

        {/* ✅ NEW: Unit (only for non-academic staff) */}
        {form.main_role === "non_academic_staff" && (
          <Select
            label="Unit"
            required
            value={form.unit}
            onChange={(v) => update("unit", v as StaffUnit)}
            options={UNIT_OPTIONS}
          />
        )}

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
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </div>

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
