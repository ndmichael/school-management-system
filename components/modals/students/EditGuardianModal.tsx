"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { Modal } from "../Modal";

interface Guardian {
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_status: string | null;
}

interface GuardianApiResponse {
  guardian?: Guardian;
  error?: string;
  message?: string;
}

interface Props {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}

const EMPTY_GUARDIAN: Guardian = {
  guardian_first_name: null,
  guardian_last_name: null,
  guardian_phone: null,
  guardian_status: null,
};

const GUARDIAN_RELATIONSHIPS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt", label: "Aunt" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandmother", label: "Grandmother" },
  { value: "spouse", label: "Spouse" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
] as const;

async function readResponseError(
  response: Response,
): Promise<string> {
  const body = (await response
    .json()
    .catch(() => null)) as GuardianApiResponse | null;

  return (
    body?.error ||
    body?.message ||
    `Request failed (${response.status})`
  );
}

export function EditGuardianModal({
  studentId,
  isOpen,
  onClose,
  onUpdated,
}: Props) {
  const [guardian, setGuardian] =
    useState<Guardian | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const controller = new AbortController();

    async function loadGuardianInformation() {
      try {
        setLoading(true);
        setGuardian(null);

        const response = await fetch(
          `/api/admin/students/${studentId}/guardian`,
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
          (await response.json()) as GuardianApiResponse;

        if (!body.guardian) {
          throw new Error(
            "Guardian information was not returned.",
          );
        }

        setGuardian({
          ...EMPTY_GUARDIAN,
          ...body.guardian,
        });
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
            : "Failed to load guardian information.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadGuardianInformation();

    return () => {
      controller.abort();
    };
  }, [isOpen, studentId]);

  function updateField<K extends keyof Guardian>(
    field: K,
    value: Guardian[K],
  ) {
    setGuardian((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  async function save() {
    if (!guardian || saving) return;

    const hasGuardianInformation =
      Boolean(guardian.guardian_first_name?.trim()) ||
      Boolean(guardian.guardian_last_name?.trim()) ||
      Boolean(guardian.guardian_phone?.trim()) ||
      Boolean(guardian.guardian_status?.trim());

    if (
      hasGuardianInformation &&
      !guardian.guardian_phone?.trim()
    ) {
      toast.error(
        "Guardian phone is required when guardian information is provided.",
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/students/${studentId}/guardian`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guardian_first_name:
              guardian.guardian_first_name?.trim() ||
              null,

            guardian_last_name:
              guardian.guardian_last_name?.trim() ||
              null,

            guardian_phone:
              guardian.guardian_phone?.trim() || null,

            guardian_status:
              guardian.guardian_status?.trim() ||
              null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readResponseError(response),
        );
      }

      toast.success(
        "Guardian information updated successfully.",
      );

      await onUpdated();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update guardian information.",
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
      title="Edit Guardian Information"
      size="md"
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-gray-600">
          Loading guardian information...
        </p>
      ) : !guardian ? (
        <p className="py-6 text-center text-sm text-gray-600">
          Guardian information could not be loaded.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="First Name"
              value={
                guardian.guardian_first_name ?? ""
              }
              onChange={(value) =>
                updateField(
                  "guardian_first_name",
                  value || null,
                )
              }
            />

            <InputField
              label="Last Name"
              value={
                guardian.guardian_last_name ?? ""
              }
              onChange={(value) =>
                updateField(
                  "guardian_last_name",
                  value || null,
                )
              }
            />

            <InputField
              label="Phone"
              type="tel"
              value={guardian.guardian_phone ?? ""}
              onChange={(value) =>
                updateField(
                  "guardian_phone",
                  value || null,
                )
              }
            />

            <SelectField
              label="Relationship"
              value={guardian.guardian_status ?? ""}
              options={GUARDIAN_RELATIONSHIPS}
              onChange={(value) =>
                updateField(
                  "guardian_status",
                  value || null,
                )
              }
            />
          </div>

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
              disabled={saving}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "tel";
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      >
        <option value="">Select relationship</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}