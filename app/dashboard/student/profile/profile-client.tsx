"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Mail, MapPin, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {Select }from "@/components/shared/Select";

type ProfileRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
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

type ProfileFormValues = {
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  address: string;
  state_of_origin: string;
  lga_of_origin: string;
  gender: string;
  date_of_birth: string; // yyyy-mm-dd
};

function dicebearFallback(seed: string): string {
  const safe = encodeURIComponent(seed || "Student");
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${safe}&backgroundColor=b6e3f4`;
}

export default function ProfileClient({ userId, authEmail, initialProfile, student }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [isSaving, startSaving] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow>(initialProfile);

  const [form, setForm] = useState<ProfileFormValues>(() => ({
    first_name: initialProfile.first_name ?? "",
    middle_name: initialProfile.middle_name ?? "",
    last_name: initialProfile.last_name ?? "",
    phone: initialProfile.phone ?? "",
    address: initialProfile.address ?? "",
    state_of_origin: initialProfile.state_of_origin ?? "",
    lga_of_origin: initialProfile.lga_of_origin ?? "",
    gender: initialProfile.gender ?? "",
    date_of_birth: initialProfile.date_of_birth ?? "",
  }));

  const displayName = useMemo(() => {
    const parts = [form.first_name, form.middle_name, form.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : "Student";
  }, [form.first_name, form.middle_name, form.last_name]);

  const avatarSrc =
    profile.avatar_url && profile.avatar_url.startsWith("http")
      ? profile.avatar_url
      : profile.avatar_url
      ? profile.avatar_url
      : dicebearFallback(displayName);

  async function onSave() {
    setError(null);

    startSaving(async () => {
      const { error: updErr, data } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name || null,
          middle_name: form.middle_name || null,
          last_name: form.last_name || null,
          phone: form.phone || null,
          address: form.address || null,
          state_of_origin: form.state_of_origin || null,
          lga_of_origin: form.lga_of_origin || null,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select(
          "id, first_name, middle_name, last_name, email, phone, avatar_url, date_of_birth, gender, address, state_of_origin, lga_of_origin"
        )
        .single<ProfileRow>();

      if (updErr) {
        setError(updErr.message);
        return;
      }

      if (data) setProfile(data);

      toast.success("Profile updated successfully");
      router.refresh();
    });
  }

  async function onAvatarChange(file: File | null) {
    if (!file) return;
    setError(null);
    setIsUploading(true);

    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Max file size is 5MB.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const up = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw new Error(up.error.message);

      const pub = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.data.publicUrl;

      const { error: updErr, data } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select(
          "id, first_name, middle_name, last_name, email, phone, avatar_url, date_of_birth, gender, address, state_of_origin, lga_of_origin"
        )
        .single<ProfileRow>();

      if (updErr) throw new Error(updErr.message);
      if (data) setProfile(data);

      toast.success("Profile photo updated");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Avatar upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Summary */}
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

            {student?.status ? (
              <span
                className={`inline-block mt-2 px-3 py-1 text-xs rounded-full font-medium ${
                  student.status === "active"
                    ? "bg-green-100 text-green-700"
                    : student.status === "suspended"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {student.status.toUpperCase()}
              </span>
            ) : null}

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
                  onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {/* Personal Info (editable) + Academic Info (readonly) */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" /> Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" value={form.first_name} onChange={(v) => setForm((p) => ({ ...p, first_name: v }))} />
            <Field label="Middle name" value={form.middle_name} onChange={(v) => setForm((p) => ({ ...p, middle_name: v }))} />
            <Field label="Last name" value={form.last_name} onChange={(v) => setForm((p) => ({ ...p, last_name: v }))} />

            <ReadOnlyRow label="Email" value={authEmail || profile.email || "—"} icon={<Mail className="w-4 h-4 text-blue-600" />} />

            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
              icon={<Phone className="w-4 h-4 text-blue-600" />}
            />

            {/* ✅ Gender dropdown */}
            <div>
              <label className="text-xs text-gray-500">Gender</label>
              <div className="mt-1">
                <Select
                  label="Gender"
                  value={form.gender ?? ""}
                  onChange={(v) => setForm((p) => ({ ...p, gender: v || "" }))}
                  options={[
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                  ]}
                  required
                />

              </div>
            </div>

            <Field
              label="Date of birth"
              value={form.date_of_birth}
              onChange={(v) => setForm((p) => ({ ...p, date_of_birth: v }))}
              type="date"
              icon={<Calendar className="w-4 h-4 text-blue-600" />}
            />

            <Field label="State of origin" value={form.state_of_origin} onChange={(v) => setForm((p) => ({ ...p, state_of_origin: v }))} />
            <Field label="LGA of origin" value={form.lga_of_origin} onChange={(v) => setForm((p) => ({ ...p, lga_of_origin: v }))} />
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500">Address</label>
            <div className="mt-1 relative">
              <MapPin className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
              <textarea
                className="w-full min-h-[88px] rounded-xl border border-gray-300 px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Your address"
              />
            </div>
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

        {/* Academic (readonly minimal) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Academic Information</h3>

          <div className="space-y-4 text-sm">
            <Info label="Matric No" value={student?.matric_no ?? "—"} />
            <Info label="Level" value={student?.level ?? "—"} />
            <Info label="CGPA" value={student?.cgpa != null ? String(student.cgpa) : "—"} />
            <Info label="Enrollment Date" value={student?.enrollment_date ?? "—"} />
            <Info label="Status" value={student?.status ?? "—"} />
          </div>

          <p className="text-xs text-gray-500 mt-6">Academic fields are managed by the school admin.</p>
        </div>
      </div>
    </div>
  );
}

/* Small components */

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date";
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const { label, value, onChange, type = "text", placeholder, icon } = props;

  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <div className="mt-1 relative">
        {icon ? <span className="absolute left-3 top-3">{icon}</span> : null}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            icon ? "pl-9" : ""
          }`}
        />
      </div>
    </div>
  );
}

function ReadOnlyRow(props: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{props.label}</p>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
        {props.icon ? props.icon : null}
        <span className="truncate">{props.value}</span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}
