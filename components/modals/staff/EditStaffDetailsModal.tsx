"use client";

import { useMemo, useState, useEffect } from "react";
import { Modal } from "@/components/modals";
import { Input, Select } from "@/components/shared";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";

interface EditStaffModalProps {
  isOpen: boolean;
  staffId: string;
  onClose: () => void;
  onUpdated: () => void;
}

type MainRole = "academic_staff" | "non_academic_staff";
type StaffUnit = "admissions" | "bursary" | "exams";

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

interface ExistingQualificationDocument {
  id?: string;
  doc_type: string;
  bucket: string;
  path: string;
  original_name?: string | null;
  mime_type?: string | null;
}

interface StaffData {
  main_role: MainRole;
  unit: StaffUnit | null;
  hire_date: string | null;

  designation: string | null;
  specialization: string | null;
  department_id: string | null;
  status: string;
  bank_name: string | null;
  account_number: string | null;
  avatar_file: FileRef | null;
  signature_file: FileRef | null;
  profiles: StaffProfile;
  qualification_documents?: ExistingQualificationDocument[];
  staff_documents?: ExistingQualificationDocument[];
}

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

export function EditStaffModal({
  isOpen,
  staffId,
  onClose,
  onUpdated,
}: EditStaffModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<StaffData | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [qualificationUploads, setQualificationUploads] = useState<
    StaffDocumentItem[]
  >([makeQualificationRow()]);

  const isAcademic = data?.main_role === "academic_staff";
  const isNonAcademic = data?.main_role === "non_academic_staff";

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      try {
        setLoading(true);

        const [staffRes, depRes] = await Promise.all([
          fetch(`/api/admin/staff/${staffId}`),
          fetch("/api/admin/departments"),
        ]);

        if (!staffRes.ok) throw new Error("Failed to load staff");
        if (!depRes.ok) throw new Error("Failed to load departments");

        const staffJson = (await staffRes.json()) as { staff: StaffData };
        const depJson = (await depRes.json()) as {
          departments?: { id: string; name: string }[];
        };

        setData(staffJson.staff);
        setDepartments(depJson.departments || []);
      } catch {
        toast.error("Failed to load staff");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, staffId]);

  useEffect(() => {
    if (!data) return;

    if (data.main_role === "non_academic_staff" && data.department_id) {
      setData((prev) => (prev ? { ...prev, department_id: null } : prev));
    }

    if (data.main_role === "academic_staff" && data.unit) {
      setData((prev) => (prev ? { ...prev, unit: null } : prev));
    }
  }, [data?.main_role]);

  function handleAvatarChange(file: File | null) {
    if (file) {
      const err = validateUploadFile(file, { imageOnly: true });
      if (err) {
        toast.error(`Avatar: ${err}`);
        setAvatarFile(null);
        return;
      }
    }
    setAvatarFile(file);
  }

  function handleSignatureChange(file: File | null) {
    if (file) {
      const err = validateUploadFile(file, { imageOnly: true });
      if (err) {
        toast.error(`Signature: ${err}`);
        setSignatureFile(null);
        return;
      }
    }
    setSignatureFile(file);
  }

  function updateQualificationFile(docId: string, file: File | null) {
    setQualificationUploads((prev) =>
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
  }

  function addQualificationRow() {
    setQualificationUploads((prev) => [...prev, makeQualificationRow()]);
  }

  function removeQualificationRow(docId: string) {
    setQualificationUploads((prev) => prev.filter((doc) => doc.id !== docId));
  }

  async function uploadFile(file: File, folder: string): Promise<FileRef> {
    const ext = file.name.split(".").pop()?.trim().toLowerCase() || "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) throw new Error(error.message);

    return { bucket: BUCKET, path };
  }

  async function save() {
    if (!data) return;

    if (
      !data.profiles.first_name.trim() ||
      !data.profiles.last_name.trim() ||
      !data.profiles.email.trim()
    ) {
      toast.error("First name, last name and email are required.");
      return;
    }

    if (!data.hire_date) {
      toast.error("Hire date is required.");
      return;
    }

    if (data.main_role === "academic_staff" && !data.department_id) {
      toast.error("Department is required for Academic Staff.");
      return;
    }

    if (data.main_role === "non_academic_staff" && !data.unit) {
      toast.error("Unit is required for Non-Academic Staff.");
      return;
    }

    try {
      setUploading(true);

      const avatarRef = avatarFile
        ? await uploadFile(avatarFile, "staff/avatars")
        : undefined;

      const signatureRef = signatureFile
        ? await uploadFile(signatureFile, "staff/signatures")
        : undefined;

      const uploadedQualificationDocuments: Array<{
        doc_type: string;
        file: FileRef;
        original_name: string;
        mime_type: string | null;
      }> = [];

      for (const doc of qualificationUploads) {
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
        main_role: data.main_role,
        unit: data.main_role === "non_academic_staff" ? data.unit : null,
        hire_date: data.hire_date || null,

        designation: data.designation?.trim() || null,
        specialization: data.specialization?.trim() || null,
        department_id:
          data.main_role === "academic_staff" ? data.department_id : null,
        status: data.status,
        bank_name: data.bank_name?.trim() || null,
        account_number: data.account_number?.trim() || null,

        profiles: {
          first_name: data.profiles.first_name.trim(),
          middle_name: data.profiles.middle_name?.trim() || null,
          last_name: data.profiles.last_name.trim(),
          email: data.profiles.email.trim().toLowerCase(),
          phone: data.profiles.phone?.trim() || null,
          gender: data.profiles.gender || null,
          date_of_birth: data.profiles.date_of_birth || null,
          state_of_origin: data.profiles.state_of_origin?.trim() || null,
          lga_of_origin: data.profiles.lga_of_origin?.trim() || null,
          religion: data.profiles.religion?.trim() || null,
        },

        avatar_file: avatarRef,
        signature_file: signatureRef,
        qualification_documents: uploadedQualificationDocuments,
      };

      const res = await fetch(`/api/admin/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update staff");

      toast.success("Staff updated");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  if (!isOpen) return null;

  const existingDocs = data?.qualification_documents ?? data?.staff_documents ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Edit Staff">
      {!data ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <div className="space-y-6">
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

          <Select
            label="Staff Type"
            value={data.main_role}
            onChange={(value) =>
              setData({ ...data, main_role: value as MainRole })
            }
            options={[
              { value: "academic_staff", label: "Academic Staff" },
              { value: "non_academic_staff", label: "Non-Academic Staff" },
            ]}
            required
          />

          {isNonAcademic && (
            <Select
              label="Unit"
              value={data.unit ?? ""}
              onChange={(value) =>
                setData({ ...data, unit: value as StaffUnit })
              }
              options={UNIT_OPTIONS}
              required
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Designation"
              value={data.designation ?? ""}
              onChange={(e) => setData({ ...data, designation: e.target.value })}
            />
            <Input
              label="Specialization"
              value={data.specialization ?? ""}
              onChange={(e) =>
                setData({ ...data, specialization: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hire Date"
              type="date"
              value={data.hire_date ?? ""}
              onChange={(e) => setData({ ...data, hire_date: e.target.value })}
              required
            />

            {isAcademic ? (
              <Select
                label="Department"
                value={data.department_id ?? ""}
                onChange={(value) =>
                  setData({ ...data, department_id: value as string })
                }
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                required
              />
            ) : (
              <div />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bank Name"
              value={data.bank_name ?? ""}
              onChange={(e) => setData({ ...data, bank_name: e.target.value })}
            />
            <Input
              label="Account Number"
              value={data.account_number ?? ""}
              onChange={(e) =>
                setData({ ...data, account_number: e.target.value })
              }
            />
          </div>

          <Select
            label="Status"
            value={data.status}
            onChange={(value) => setData({ ...data, status: value })}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "suspended", label: "Suspended" },
            ]}
            required
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Replace Avatar
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={loading || uploading}
                onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border px-3 py-3 text-sm"
              />
              {data.avatar_file?.path ? (
                <p className="text-xs text-gray-500">
                  Current: {data.avatar_file.path}
                </p>
              ) : null}
              {avatarFile ? (
                <p className="text-xs text-gray-500">New: {avatarFile.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Replace Signature
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={loading || uploading}
                onChange={(e) =>
                  handleSignatureChange(e.target.files?.[0] ?? null)
                }
                className="block w-full rounded-xl border px-3 py-3 text-sm"
              />
              {data.signature_file?.path ? (
                <p className="text-xs text-gray-500">
                  Current: {data.signature_file.path}
                </p>
              ) : null}
              {signatureFile ? (
                <p className="text-xs text-gray-500">
                  New: {signatureFile.name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Existing Qualification Documents
              </h3>
              {existingDocs.length === 0 ? (
                <p className="text-sm text-gray-500 mt-2">
                  No qualification documents yet.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {existingDocs.map((doc, idx) => (
                    <div
                      key={doc.id ?? `${doc.path}-${idx}`}
                      className="rounded-lg border p-3 text-sm text-gray-700"
                    >
                      {doc.original_name || doc.path}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Add Qualification Documents
              </h3>
              <button
                type="button"
                onClick={addQualificationRow}
                className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200"
              >
                Add Another
              </button>
            </div>

            <div className="space-y-3">
              {qualificationUploads.map((doc, index) => (
                <div key={doc.id} className="border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      Qualification Document {index + 1}
                    </p>
                    {qualificationUploads.length > 1 ? (
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
                    onChange={(e) =>
                      updateQualificationFile(doc.id, e.target.files?.[0] ?? null)
                    }
                    className="block w-full rounded-xl border px-3 py-3 text-sm"
                  />

                  {doc.file ? (
                    <p className="text-xs text-gray-500">{doc.file.name}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={save}
            disabled={loading || uploading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60"
          >
            {uploading ? "Uploading..." : loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </Modal>
  );
}