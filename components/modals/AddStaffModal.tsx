"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { Input, Select } from "@/components/shared";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";

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

type FileRef = {
  bucket: string;
  path: string;
};

type StaffDocumentItem = {
  id: string;
  doc_type: string;
  label: string;
  file: File | null;
};

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
  unit: "" | StaffUnit;

  designation: string;
  specialization: string;

  department_id: string;
  hire_date: string;

  bank_name: string;
  account_number: string;
};

const UNIT_OPTIONS: Array<{ value: StaffUnit; label: string }> = [
  { value: "admissions", label: "Admissions" },
  { value: "bursary", label: "Bursary" },
  { value: "exams", label: "Exams" },
];

const BUCKET = "applications";
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const IMAGE_ONLY_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function makeQualificationRow(): StaffDocumentItem {
  return {
    id: `qualification-${Math.random().toString(36).slice(2, 10)}`,
    doc_type: "qualification",
    label: "Qualification Document",
    file: null,
  };
}

function validateUploadFile(
  file: File,
  options?: { imageOnly?: boolean }
): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Max ${MAX_FILE_SIZE_MB}MB`;
  }

  const allowed = options?.imageOnly ? IMAGE_ONLY_TYPES : DOC_ALLOWED_TYPES;

  if (!allowed.includes(file.type)) {
    return options?.imageOnly
      ? "Only JPG, PNG, or WebP images are allowed"
      : "Only JPG, PNG, WebP, PDF, DOC, or DOCX files are allowed";
  }

  return null;
}

export function AddStaffModal({ isOpen, onClose, onCreated }: AddStaffModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [qualificationDocuments, setQualificationDocuments] = useState<StaffDocumentItem[]>([
    makeQualificationRow(),
  ]);

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

    bank_name: "",
    account_number: "",
  });

  const isAcademic = useMemo(() => form.main_role === "academic_staff", [form.main_role]);
  const isNonAcademic = useMemo(() => form.main_role === "non_academic_staff", [form.main_role]);

  useEffect(() => {
    if (isNonAcademic) {
      setForm((p) => ({ ...p, department_id: "" }));
    } else {
      setForm((p) => ({ ...p, unit: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.main_role]);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    async function loadDepartments() {
      try {
        const res = await fetch("/api/admin/departments", { signal: controller.signal });
        const json = (await res.json().catch(() => ({}))) as {
          departments?: Department[];
          error?: string;
        };

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

  const handleAvatarChange = (file: File | null) => {
    if (file) {
      const err = validateUploadFile(file, { imageOnly: true });
      if (err) {
        toast.error(`Avatar: ${err}`);
        setAvatarFile(null);
        return;
      }
    }
    setAvatarFile(file);
  };

  const handleSignatureChange = (file: File | null) => {
    if (file) {
      const err = validateUploadFile(file, { imageOnly: true });
      if (err) {
        toast.error(`Signature: ${err}`);
        setSignatureFile(null);
        return;
      }
    }
    setSignatureFile(file);
  };

  const updateQualificationFile = (docId: string, file: File | null) => {
    setQualificationDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;

        if (file) {
          const err = validateUploadFile(file);
          if (err) {
            toast.error(`${doc.label}: ${err}`);
            return { ...doc, file: null };
          }
        }

        return { ...doc, file };
      })
    );
  };

  const addQualificationRow = () => {
    setQualificationDocuments((prev) => [...prev, makeQualificationRow()]);
  };

  const removeQualificationRow = (docId: string) => {
    setQualificationDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  async function uploadFile(file: File, folder: string): Promise<FileRef> {
    const ext = file.name.split(".").pop()?.trim().toLowerCase() || "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) throw new Error(error.message);

    return {
      bucket: BUCKET,
      path,
    };
  }

  const resetForm = () => {
    setForm({
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

      bank_name: "",
      account_number: "",
    });

    setAvatarFile(null);
    setSignatureFile(null);
    setQualificationDocuments([makeQualificationRow()]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error("First name, last name and email are required.");
      return;
    }

    if (!form.phone.trim()) {
      toast.error("Phone number is required.");
      return;
    }

    if (!form.gender) {
      toast.error("Gender is required.");
      return;
    }

    if (!form.designation.trim()) {
      toast.error("Designation is required.");
      return;
    }

    if (!form.hire_date) {
      toast.error("Hire date is required.");
      return;
    }

    if (isAcademic && !form.department_id) {
      toast.error("Department is required for Academic Staff.");
      return;
    }

    if (isNonAcademic && !form.unit) {
      toast.error("Unit is required for Non-Academic Staff.");
      return;
    }

    try {
      setUploading(true);

      const avatarRef = avatarFile
        ? await uploadFile(avatarFile, "staff/avatars")
        : null;

      const signatureRef = signatureFile
        ? await uploadFile(signatureFile, "staff/signatures")
        : null;

      const uploadedQualificationDocuments = [];

      for (const doc of qualificationDocuments) {
        if (!doc.file) continue;

        const docRef = await uploadFile(doc.file, "staff/qualifications");

        uploadedQualificationDocuments.push({
          doc_type: doc.doc_type,
          file: docRef,
          original_name: doc.file.name,
          mime_type: doc.file.type || null,
        });
      }

      setUploading(false);
      setLoading(true);

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
        unit: isNonAcademic ? form.unit : null,

        designation: form.designation.trim(),
        specialization: form.specialization.trim() ? form.specialization.trim() : null,

        department_id: isAcademic ? form.department_id : null,
        hire_date: form.hire_date || null,

        bank_name: form.bank_name.trim() ? form.bank_name.trim() : null,
        account_number: form.account_number.trim() ? form.account_number.trim() : null,

        avatar_file: avatarRef,
        signature_file: signatureRef,
        qualification_documents: uploadedQualificationDocuments,
      };

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
      resetForm();
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unexpected error creating staff");
    } finally {
      setLoading(false);
      setUploading(false);
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

        {isNonAcademic && (
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

          {isAcademic ? (
            <Select
              label="Department"
              required
              value={form.department_id}
              onChange={(v) => update("department_id", v)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          ) : (
            <div />
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Bank Name"
            placeholder="Access Bank"
            value={form.bank_name}
            onChange={(e) => update("bank_name", e.target.value)}
          />
          <Input
            label="Account Number"
            placeholder="0123456789"
            value={form.account_number}
            onChange={(e) => update("account_number", e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Staff Avatar</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={loading || uploading}
              onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border px-3 py-3 text-sm"
            />
            {avatarFile ? <p className="text-xs text-gray-500">{avatarFile.name}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Signature</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={loading || uploading}
              onChange={(e) => handleSignatureChange(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border px-3 py-3 text-sm"
            />
            {signatureFile ? <p className="text-xs text-gray-500">{signatureFile.name}</p> : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Qualification Documents</h3>
            <button
              type="button"
              onClick={addQualificationRow}
              className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200"
            >
              Add Another
            </button>
          </div>

          <div className="space-y-3">
            {qualificationDocuments.map((doc, index) => (
              <div key={doc.id} className="border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Qualification Document {index + 1}
                  </p>
                  {qualificationDocuments.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeQualificationRow(doc.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  disabled={loading || uploading}
                  onChange={(e) => updateQualificationFile(doc.id, e.target.files?.[0] ?? null)}
                  className="block w-full rounded-xl border px-3 py-3 text-sm"
                />

                {doc.file ? <p className="text-xs text-gray-500">{doc.file.name}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-60"
          >
            {uploading ? "Uploading..." : loading ? "Creating..." : "Add Staff"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading || uploading}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}