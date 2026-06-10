"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { Modal } from "../Modal";

interface Academic {
  matric_no: string;
  program_id: string | null;
  department_id: string | null;
  admission_session_id: string | null;
  enrollment_date: string | null;
  sponsorship_type: string | null;
  student_status: string | null;

  level: string | null;
  registration_status: string | null;

  current_registration_id: string | null;
  current_session_id: string | null;
  current_session_name: string | null;
}

interface AcademicOption {
  id: string;
  name: string;
}

interface AcademicOptions {
  programs: AcademicOption[];
  departments: AcademicOption[];
  sessions: AcademicOption[];
}

interface AcademicApiResponse {
  academic?: Academic;
  options?: AcademicOptions;
  error?: string;
  message?: string;
}

interface Props {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}

const EMPTY_OPTIONS: AcademicOptions = {
  programs: [],
  departments: [],
  sessions: [],
};

async function readResponseError(
  response: Response,
): Promise<string> {
  const body = (await response
    .json()
    .catch(() => null)) as AcademicApiResponse | null;

  return (
    body?.error ||
    body?.message ||
    `Request failed (${response.status})`
  );
}

export function EditAcademicModal({
  studentId,
  isOpen,
  onClose,
  onUpdated,
}: Props) {
  const [academic, setAcademic] =
    useState<Academic | null>(null);

  const [options, setOptions] =
    useState<AcademicOptions>(EMPTY_OPTIONS);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const controller = new AbortController();

    async function loadAcademicInformation() {
      try {
        setLoading(true);
        setAcademic(null);

        const response = await fetch(
          `/api/admin/students/${studentId}/academic`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            await readResponseError(response),
          );
        }

        const body =
          (await response.json()) as AcademicApiResponse;

        if (!body.academic) {
          throw new Error(
            "Academic information was not returned.",
          );
        }

        setAcademic(body.academic);
        setOptions(body.options ?? EMPTY_OPTIONS);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load academic information.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAcademicInformation();

    return () => {
      controller.abort();
    };
  }, [isOpen, studentId]);

  function updateField<K extends keyof Academic>(
    field: K,
    value: Academic[K],
  ) {
    setAcademic((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  async function save() {
    if (!academic || saving) return;

    if (!academic.matric_no.trim()) {
      toast.error("Matric number is required.");
      return;
    }

    if (!academic.current_session_id) {
      toast.error(
        "No active academic session is configured.",
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/students/${studentId}/academic`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matric_no: academic.matric_no.trim(),
            program_id: academic.program_id,
            department_id: academic.department_id,
            admission_session_id:
              academic.admission_session_id,
            enrollment_date: academic.enrollment_date,
            sponsorship_type:
              academic.sponsorship_type?.trim() || null,
            student_status: academic.student_status,
            level: academic.level?.trim() || null,
            registration_status:
              academic.registration_status?.trim() ||
              "registered",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readResponseError(response),
        );
      }

      toast.success(
        "Academic information updated successfully.",
      );

      await onUpdated();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update academic information.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Academic Information"
      size="lg"
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-gray-600">
          Loading academic information...
        </p>
      ) : !academic ? (
        <p className="py-6 text-center text-sm text-gray-600">
          Academic information could not be loaded.
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="mb-3 font-semibold text-gray-900">
              Student Academic Record
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Matric Number"
                required
                value={academic.matric_no}
                onChange={(value) =>
                  updateField("matric_no", value)
                }
              />

              <SelectField
                label="Program"
                value={academic.program_id ?? ""}
                options={options.programs}
                placeholder="Select program"
                onChange={(value) =>
                  updateField(
                    "program_id",
                    value || null,
                  )
                }
              />

              <SelectField
                label="Department"
                value={academic.department_id ?? ""}
                options={options.departments}
                placeholder="Select department"
                onChange={(value) =>
                  updateField(
                    "department_id",
                    value || null,
                  )
                }
              />

              <SelectField
                label="Admission Session"
                value={
                  academic.admission_session_id ?? ""
                }
                options={options.sessions}
                placeholder="Select admission session"
                onChange={(value) =>
                  updateField(
                    "admission_session_id",
                    value || null,
                  )
                }
              />

              <InputField
                label="Enrollment Date"
                type="date"
                value={academic.enrollment_date ?? ""}
                onChange={(value) =>
                  updateField(
                    "enrollment_date",
                    value || null,
                  )
                }
              />

              <InputField
                label="Sponsorship Type"
                value={academic.sponsorship_type ?? ""}
                placeholder="Example: none, scholarship"
                onChange={(value) =>
                  updateField(
                    "sponsorship_type",
                    value || null,
                  )
                }
              />

              <StaticSelectField
                label="Student Status"
                value={academic.student_status ?? ""}
                options={[
                  {
                    value: "active",
                    label: "Active",
                  },
                  {
                    value: "suspended",
                    label: "Suspended",
                  },
                  {
                    value: "graduated",
                    label: "Graduated",
                  },
                ]}
                placeholder="Select status"
                onChange={(value) =>
                  updateField(
                    "student_status",
                    value || null,
                  )
                }
              />
            </div>
          </section>

          <section className="border-t pt-5">
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900">
                Current Session Registration
              </h3>

              <p className="text-sm text-gray-500">
                {academic.current_session_name
                  ? `Active session: ${academic.current_session_name}`
                  : "No active session configured"}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Current Level"
                value={academic.level ?? ""}
                placeholder="Example: 100, ND1, HND2"
                disabled={!academic.current_session_id}
                onChange={(value) =>
                  updateField("level", value || null)
                }
              />

              <InputField
                label="Registration Status"
                value={
                  academic.registration_status ?? ""
                }
                placeholder="Example: registered"
                disabled={!academic.current_session_id}
                onChange={(value) =>
                  updateField(
                    "registration_status",
                    value || null,
                  )
                }
              />
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void save()}
              disabled={
                saving ||
                !academic.current_session_id
              }
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: AcademicOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
          >
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function StaticSelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}