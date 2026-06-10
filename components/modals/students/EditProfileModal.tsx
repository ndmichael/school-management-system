"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { Modal } from "../Modal";

interface Profile {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nin: string | null;
  address: string | null;
  state_of_origin: string | null;
  lga_of_origin: string | null;
  religion: string | null;
}

interface Props {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}

interface ApiResponse {
  profile?: Profile;
  error?: string;
  message?: string;
}

async function readResponseError(
  response: Response,
): Promise<string> {
  const body = (await response
    .json()
    .catch(() => null)) as ApiResponse | null;

  return (
    body?.error ||
    body?.message ||
    `Request failed (${response.status})`
  );
}

const EMPTY_PROFILE: Profile = {
  first_name: "",
  middle_name: null,
  last_name: "",
  email: "",
  phone: null,
  date_of_birth: null,
  gender: null,
  nin: null,
  address: null,
  state_of_origin: null,
  lga_of_origin: null,
  religion: null,
};

export function EditProfileModal({
  studentId,
  isOpen,
  onClose,
  onUpdated,
}: Props) {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const controller = new AbortController();

    async function loadProfile() {
      try {
        setLoading(true);
        setProfile(null);

        const response = await fetch(
          `/api/admin/students/${studentId}/profile`,
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
          (await response.json()) as ApiResponse;

        if (!body.profile) {
          throw new Error(
            "Student profile was not returned.",
          );
        }

        setProfile({
          ...EMPTY_PROFILE,
          ...body.profile,
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
            : "Failed to load profile.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      controller.abort();
    };
  }, [isOpen, studentId]);

  function updateField<K extends keyof Profile>(
    field: K,
    value: Profile[K],
  ) {
    setProfile((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  async function save() {
    if (!profile || saving) return;

    const firstName = profile.first_name.trim();
    const lastName = profile.last_name.trim();

    if (!firstName) {
      toast.error("First name is required.");
      return;
    }

    if (!lastName) {
      toast.error("Last name is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/students/${studentId}/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: firstName,
            middle_name:
              profile.middle_name?.trim() || null,
            last_name: lastName,
            phone: profile.phone?.trim() || null,
            date_of_birth:
              profile.date_of_birth || null,
            gender: profile.gender || null,
            nin: profile.nin?.trim() || null,
            address:
              profile.address?.trim() || null,
            state_of_origin:
              profile.state_of_origin?.trim() || null,
            lga_of_origin:
              profile.lga_of_origin?.trim() || null,
            religion:
              profile.religion?.trim() || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readResponseError(response),
        );
      }

      toast.success("Profile updated successfully.");

      await onUpdated();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update profile.",
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
      title="Edit Profile Information"
      size="lg"
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-gray-600">
          Loading profile...
        </p>
      ) : !profile ? (
        <p className="py-6 text-center text-sm text-gray-600">
          Profile could not be loaded.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="First Name"
              required
              value={profile.first_name}
              onChange={(value) =>
                updateField("first_name", value)
              }
            />

            <Field
              label="Middle Name"
              value={profile.middle_name ?? ""}
              onChange={(value) =>
                updateField(
                  "middle_name",
                  value || null,
                )
              }
            />

            <Field
              label="Last Name"
              required
              value={profile.last_name}
              onChange={(value) =>
                updateField("last_name", value)
              }
            />

            <Field
              label="Email"
              type="email"
              value={profile.email}
              disabled
              helperText="Email changes require a separate account update."
              onChange={() => undefined}
            />

            <Field
              label="Phone"
              type="tel"
              value={profile.phone ?? ""}
              onChange={(value) =>
                updateField("phone", value || null)
              }
            />

            <Field
              label="Date of Birth"
              type="date"
              value={profile.date_of_birth ?? ""}
              onChange={(value) =>
                updateField(
                  "date_of_birth",
                  value || null,
                )
              }
            />

            <SelectField
              label="Gender"
              value={profile.gender ?? ""}
              options={[
                { value: "", label: "Select gender" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
              onChange={(value) =>
                updateField("gender", value || null)
              }
            />

            <Field
              label="NIN"
              value={profile.nin ?? ""}
              onChange={(value) =>
                updateField("nin", value || null)
              }
            />

            <Field
              label="State of Origin"
              value={profile.state_of_origin ?? ""}
              onChange={(value) =>
                updateField(
                  "state_of_origin",
                  value || null,
                )
              }
            />

            <Field
              label="LGA of Origin"
              value={profile.lga_of_origin ?? ""}
              onChange={(value) =>
                updateField(
                  "lga_of_origin",
                  value || null,
                )
              }
            />

            <Field
              label="Religion"
              value={profile.religion ?? ""}
              onChange={(value) =>
                updateField(
                  "religion",
                  value || null,
                )
              }
            />

            <div className="md:col-span-2">
              <TextAreaField
                label="Address"
                value={profile.address ?? ""}
                onChange={(value) =>
                  updateField(
                    "address",
                    value || null,
                  )
                }
              />
            </div>
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "date";
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
      />

      {helperText && (
        <p className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      )}
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
  options: Array<{
    value: string;
    label: string;
  }>;
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

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <textarea
        rows={3}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
    </div>
  );
}