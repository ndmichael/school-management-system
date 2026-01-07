// app/dashboard/non_academic_staff/settings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  main_role: string | null;
};

function safeTrim(v: string) {
  const t = v.trim();
  return t.length ? t : "";
}

export default function NonAcademicSettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: p, error } = await supabase
        .from("profiles")
        .select("id, first_name, middle_name, last_name, email, main_role")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (error) throw new Error(error.message);
      if (!p) throw new Error("Profile not found.");

      setProfileId(p.id);
      setEmail(p.email ?? user.email ?? "");

      setFirstName(p.first_name ?? "");
      setMiddleName(p.middle_name ?? "");
      setLastName(p.last_name ?? "");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load settings.";
      console.error(err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    if (!profileId) return;

    const fn = safeTrim(firstName);
    const mn = safeTrim(middleName);
    const ln = safeTrim(lastName);

    if (!fn || !ln) {
      toast.error("First name and last name are required.");
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: fn,
          middle_name: mn || null,
          last_name: ln,
        })
        .eq("id", profileId);

      if (error) throw new Error(error.message);

      toast.success("Profile updated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      console.error(err);
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const reauthenticateWithOldPassword = async (userEmail: string, pw: string) => {
    // Supabase doesn’t provide “check old password” directly.
    // Production-safe approach: re-auth via signInWithPassword.
    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: pw,
    });

    if (error) {
      // Common cases: wrong password, or user uses SSO/OAuth (no password).
      throw new Error(
        error.message ||
          "Re-authentication failed. If you signed in with Google/SSO, use reset password instead."
      );
    }
  };

  const savePassword = async () => {
    const oldPw = oldPassword;
    const pw = newPassword;
    const cpw = confirmPassword;

    if (!email) {
      toast.error("Missing email for re-authentication.");
      return;
    }

    if (!oldPw) {
      toast.error("Enter your current password.");
      return;
    }

    if (!pw || !cpw) {
      toast.error("Enter and confirm your new password.");
      return;
    }

    if (pw.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (pw !== cpw) {
      toast.error("New passwords do not match.");
      return;
    }

    if (oldPw === pw) {
      toast.error("New password must be different from current password.");
      return;
    }

    setSavingPassword(true);
    try {
      await reauthenticateWithOldPassword(email, oldPw);

      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw new Error(error.message);

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      console.error(err);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const resetForm = async () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    await load();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-green-200 bg-white p-4 text-sm text-gray-600">
          Loading settings…
        </div>
      </div>
    );
  }

  const greenBtn =
    "px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60";
  const greenBtnOutline =
    "px-3 py-2 text-sm rounded border border-green-200 bg-white hover:bg-green-50 disabled:opacity-60";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-600">Update your profile and password.</p>
      </div>

      {/* Profile */}
      <div className="rounded-lg border border-green-200 bg-white overflow-hidden">
        <div className="border-b border-green-200 bg-green-50 px-5 py-4">
          <h2 className="font-semibold text-green-900">Profile</h2>
          <p className="text-xs text-green-900/70">Your account email is read-only.</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Email</label>
            <input
              value={email}
              disabled
              className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">First name *</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Middle name</label>
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                autoComplete="additional-name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Last name *</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className={greenBtnOutline}
              disabled={savingProfile || savingPassword}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={saveProfile}
              className={greenBtn}
              disabled={savingProfile || savingPassword}
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-lg border border-green-200 bg-white overflow-hidden">
        <div className="border-b border-green-200 bg-green-50 px-5 py-4">
          <h2 className="font-semibold text-green-900">Password</h2>
          <p className="text-xs text-green-900/70">
            For security, enter your current password before setting a new one.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Current password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={savePassword}
              className={greenBtn}
              disabled={savingProfile || savingPassword}
            >
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            If your account uses Google/SSO (no password), password change may fail — use the “Forgot password” flow
            instead.
          </div>
        </div>
      </div>
    </div>
  );
}
