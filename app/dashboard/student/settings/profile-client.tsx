"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

import ChangePasswordCard from "@/components/security/ChangePasswordCard";
import { toPublicImageSrc, type StoredFile } from "@/lib/storage-images";

type ProfileRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_file: StoredFile | null;
  address: string | null;
  state_of_origin: string | null;
  lga_of_origin: string | null;
};

type StudentRow = {
  id: string;
  profile_id: string;
  matric_no: string | null;
  level: string | null;
  cgpa: number | null;
  enrollment_date: string | null;
  status: string | null;
};

type Props = {
  userId: string;
  authEmail: string;
  initialProfile: ProfileRow;
  student: StudentRow | null;
};

type PatchPayload = Partial<{
  phone: string | null;
  address: string | null;
  state_of_origin: string | null;
  lga_of_origin: string | null;
  avatar_file: StoredFile | null;
}>;

type ApiOk = { profile: ProfileRow };
type ApiErr = { error: string };

function dicebearFallback(seed: string): string {
  const safe = encodeURIComponent(seed || "Student");
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${safe}&backgroundColor=b6e3f4`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function isStoredFile(v: unknown): v is StoredFile {
  if (!isRecord(v)) return false;
  return typeof v.bucket === "string" && typeof v.path === "string";
}

function parseApiResponse(json: unknown): ApiOk | ApiErr {
  if (!isRecord(json)) return { error: "Unexpected server response." };

  if ("error" in json) {
    const msg = readString(json.error);
    return { error: msg ?? "Request failed." };
  }

  if ("profile" in json) {
    const p = json.profile;
    if (!isRecord(p)) return { error: "Invalid profile returned." };

    const id = readString(p.id);
    if (!id) return { error: "Invalid profile returned." };

    const profile: ProfileRow = {
      id,
      first_name: readString(p.first_name),
      middle_name: readString(p.middle_name),
      last_name: readString(p.last_name),
      email: readString(p.email),
      phone: readString(p.phone),
      avatar_file: isStoredFile(p.avatar_file) ? p.avatar_file : null,
      address: readString(p.address),
      state_of_origin: readString(p.state_of_origin),
      lga_of_origin: readString(p.lga_of_origin),
    };

    return { profile };
  }

  return { error: "Unexpected server response." };
}

export default function SettingsClient({
  userId,
  authEmail,
  initialProfile,
  student,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<ProfileRow>(initialProfile);

  // ✅ Only student-editable fields
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [stateOfOrigin, setStateOfOrigin] = useState(profile.state_of_origin ?? "");
  const [lgaOfOrigin, setLgaOfOrigin] = useState(profile.lga_of_origin ?? "");

  const [isSaving, startSaving] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const displayName = useMemo(() => {
    const parts = [profile.first_name, profile.middle_name, profile.last_name]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((s) => s.trim());
    return parts.length ? parts.join(" ") : "Student";
  }, [profile.first_name, profile.middle_name, profile.last_name]);

  const emailForPassword = useMemo(() => {
    const v = (authEmail || profile.email || "").trim();
    return v;
  }, [authEmail, profile.email]);

  const avatarSrc = useMemo(() => {
    const fallback = dicebearFallback(displayName);
    // Uses your existing helper (supports StoredFile)
    return toPublicImageSrc(supabase, profile.avatar_file, fallback);
  }, [displayName, profile.avatar_file, supabase]);

  async function patchProfile(payload: PatchPayload): Promise<void> {
    const res = await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json: unknown = await res.json().catch(() => null);
    const parsed = parseApiResponse(json);

    if (!res.ok) {
      if ("error" in parsed) throw new Error(parsed.error);
      throw new Error("Failed to update profile.");
    }

    if ("error" in parsed) throw new Error(parsed.error);

    setProfile(parsed.profile);
  }

  function onSave(): void {
    startSaving(async () => {
      try {
        await patchProfile({
          phone: phone.trim() ? phone.trim() : null,
          address: address.trim() ? address.trim() : null,
          state_of_origin: stateOfOrigin.trim() ? stateOfOrigin.trim() : null,
          lga_of_origin: lgaOfOrigin.trim() ? lgaOfOrigin.trim() : null,
        });
        toast.success("Settings updated.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update settings.");
      }
    });
  }

  async function onAvatarChange(file: File | null): Promise<void> {
    if (!file) return;

    setIsUploading(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Max file size is 5MB.");

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });

      if (upErr) throw new Error(upErr.message);

      await patchProfile({ avatar_file: { bucket: "avatars", path } });
      toast.success("Profile photo updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avatar upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your profile, photo, and security.</p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden border bg-gray-50">
            <Image src={avatarSrc} alt={displayName} fill className="object-cover" />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
            <p className="text-sm text-gray-500">
              {student?.matric_no ?? "—"}
              {student?.level ? ` · Level ${student.level}` : ""}
            </p>

            <div className="mt-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 cursor-pointer">
                <span className="rounded-xl border border-blue-200 px-3 py-2 hover:bg-blue-50 transition">
                  {isUploading ? "Uploading..." : "Change photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    void onAvatarChange(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Forms */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Student-editable profile */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Profile</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadOnly label="First name" value={profile.first_name ?? "—"} />
            <ReadOnly label="Middle name" value={profile.middle_name ?? "—"} />
            <ReadOnly label="Last name" value={profile.last_name ?? "—"} />
            <ReadOnly label="Email" value={emailForPassword || "—"} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="State of origin" value={stateOfOrigin} onChange={setStateOfOrigin} />
            <Field label="LGA of origin" value={lgaOfOrigin} onChange={setLgaOfOrigin} />
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500">Address</label>
            <textarea
              className="mt-1 w-full min-h-[88px] rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Your address"
            />
          </div>

          <div className="mt-5">
            <button
              onClick={onSave}
              disabled={isSaving || isUploading}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

        {/* Security (reused, secure) */}
        {emailForPassword ? (
          <ChangePasswordCard email={emailForPassword} />
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Security</h3>
            <p className="text-sm text-gray-600">
              Cannot change password because your email is missing on this account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text";
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
        {value}
      </div>
    </div>
  );
}
