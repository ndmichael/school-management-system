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
  avatar_file?: FileRef | null;
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
  avatar_file?: FileRef | null;
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

function isImageFile(nameOrMime?: string | null) {
  if (!nameOrMime) return false;
  const value = nameOrMime.toLowerCase();

  return (
    value.includes("image/") ||
    value.endsWith(".jpg") ||
    value.endsWith(".jpeg") ||
    value.endsWith(".png") ||
    value.endsWith(".webp")
  );
}

function isPdfFile(nameOrMime?: string | null) {
  if (!nameOrMime) return false;
  const value = nameOrMime.toLowerCase();

  return value.includes("application/pdf") || value.endsWith(".pdf");
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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});

  const isAcademic = data?.main_role === "academic_staff";
  const isNonAcademic = data?.main_role === "non_academic_staff";

  const existingDocs: ExistingQualificationDocument[] = data
  ? data.qualification_documents ?? data.staff_documents ?? []
  : [];

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
      setData((prev) => {
        if (!prev || prev.main_role !== "non_academic_staff" || !prev.department_id) {
          return prev;
        }
        return { ...prev, department_id: null };
      });
      return;
    }

    if (data.main_role === "academic_staff" && data.unit) {
      setData((prev) => {
        if (!prev || prev.main_role !== "academic_staff" || !prev.unit) {
          return prev;
        }
        return { ...prev, unit: null };
      });
    }
  }, [data]);

  useEffect(() => {
  if (!isOpen || !data) return;

  const currentData = data;
  const currentDocs = currentData.qualification_documents ?? currentData.staff_documents ?? [];

  async function loadFileUrls() {
    try {
      const nextUrls: Record<string, string> = {};

      const currentAvatar =
        currentData.profiles.avatar_file && currentData.profiles.avatar_file.path
          ? currentData.profiles.avatar_file
          : currentData.avatar_file && currentData.avatar_file.path
          ? currentData.avatar_file
          : null;

      if (currentAvatar?.bucket && currentAvatar?.path) {
        const { data: signed } = await supabase.storage
          .from(currentAvatar.bucket)
          .createSignedUrl(currentAvatar.path, 3600);

        setAvatarUrl(signed?.signedUrl ?? null);
      } else {
        setAvatarUrl(null);
      }

      if (currentData.signature_file?.bucket && currentData.signature_file?.path) {
        const { data: signed } = await supabase.storage
          .from(currentData.signature_file.bucket)
          .createSignedUrl(currentData.signature_file.path, 3600);

        setSignatureUrl(signed?.signedUrl ?? null);
      } else {
        setSignatureUrl(null);
      }

      for (const doc of currentDocs) {
        const key = doc.id ?? `${doc.bucket}/${doc.path}`;
        const { data: signed } = await supabase.storage
          .from(doc.bucket)
          .createSignedUrl(doc.path, 3600);

        if (signed?.signedUrl) {
          nextUrls[key] = signed.signedUrl;
        }
      }

      setDocumentUrls(nextUrls);
    } catch {
      toast.error("Failed to prepare file previews");
    }
  }

  loadFileUrls();
}, [isOpen, data, supabase]);

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

    if (data.main_role === "academic_staff" && !data.hire_date) {
      toast.error("Hire date is required for Academic Staff.");
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
          avatar_file: avatarRef,
        },
        signature_file: signatureRef,
        qualification_documents: uploadedQualificationDocuments,
      };

      const res = await fetch(`/api/admin/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        step?: string;
        debug?: { message?: string | null };
      };

      if (!res.ok) {
        throw new Error(
          [json.error, json.step, json.debug?.message]
            .filter(Boolean)
            .join(" | ") || "Failed to update staff"
        );
      }

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
              type="tel"
              placeholder="08012345678 or +2348012345678"
              value={data.profiles.phone ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  profiles: {
                    ...data.profiles,
                    phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 14),
                  },
                })
              }
            />
          </div>

          <Select
            label="Staff Type"
            value={data.main_role ?? "academic_staff"}
            onChange={() => {}}
            options={[
              { value: "academic_staff", label: "Academic Staff" },
              { value: "non_academic_staff", label: "Non-Academic Staff" },
            ]}
            
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

              {avatarUrl ? (
                <div className="mt-2 rounded-xl border p-3">
                  <p className="mb-2 text-xs text-gray-500">Current Avatar</p>
                  <img
                    src={avatarUrl}
                    alt="Current avatar"
                    className="h-24 w-24 rounded-lg border object-cover"
                  />
                </div>
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

              {signatureUrl ? (
                <div className="mt-2 rounded-xl border p-3">
                  <p className="mb-2 text-xs text-gray-500">Current Signature</p>
                  <img
                    src={signatureUrl}
                    alt="Current signature"
                    className="h-24 w-full max-w-[200px] rounded-lg border bg-white object-contain"
                  />
                </div>
              ) : null}

              {signatureFile ? (
                <p className="text-xs text-gray-500">New: {signatureFile.name}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Existing Qualification Documents
              </h3>

              {existingDocs.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  No qualification documents yet.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {existingDocs.map((doc, idx) => {
                    const key = doc.id ?? `${doc.bucket}/${doc.path}`;
                    const fileUrl = documentUrls[key];
                    const fileName =
                      doc.original_name ||
                      doc.path.split("/").pop() ||
                      `Document ${idx + 1}`;

                    const imageLike = isImageFile(
                      doc.mime_type || doc.original_name || doc.path
                    );
                    const pdfLike = isPdfFile(
                      doc.mime_type || doc.original_name || doc.path
                    );

                    return (
                      <div
                        key={`${key}-${idx}`}
                        className="space-y-3 rounded-xl border bg-white p-3"
                      >
                        {imageLike && fileUrl ? (
                          <img
                            src={fileUrl}
                            alt={fileName}
                            className="h-32 w-full rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-32 w-full items-center justify-center rounded-lg border bg-gray-50 text-sm text-gray-500">
                            {pdfLike ? "PDF Document" : "Document File"}
                          </div>
                        )}

                        <div className="space-y-1">
                          <p className="flex-wrap-reversebreak-words text-sm font-medium text-gray-800">
                            {fileName}
                          </p>
                          <p className="text-xs text-gray-500">{doc.doc_type}</p>
                        </div>

                        {fileUrl ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
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
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
              >
                Add Another
              </button>
            </div>

            <div className="space-y-3">
              {qualificationUploads.map((doc, index) => (
                <div key={doc.id} className="space-y-2 rounded-xl border p-4">
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || uploading}
              className="flex-1 rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={save}
              disabled={loading || uploading}
              className="flex-1 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}