'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

import { toPublicImageSrc, type StoredFile } from '@/lib/storage-images';

type Role = 'admin' | 'student' | 'academic_staff' | 'non_academic_staff';

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_file: StoredFile | null;
  main_role: Role;
};

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNum = /\d/.test(pw);
  if (!hasUpper || !hasLower || !hasNum) {
    return 'Use at least 1 uppercase, 1 lowercase, and 1 number.';
  }
  return null;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

/** ✅ Reusable + secure: requires current password (reauth) + checker */
function ChangePasswordCard({ email }: { email: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [currentPw, setCurrentPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const pwError = useMemo(() => {
    if (pw1 !== pw2) return 'Passwords do not match.';
    return validatePassword(pw1);
  }, [pw1, pw2]);

  const canChangePassword = useMemo(() => {
    if (changingPw) return false;
    if (currentPw.trim().length === 0) return false;
    if (pw1.trim().length === 0 || pw2.trim().length === 0) return false;
    if (pwError !== null) return false;
    return true;
  }, [changingPw, currentPw, pw1, pw2, pwError]);

  const clear = () => {
    setCurrentPw('');
    setPw1('');
    setPw2('');
    setShowCur(false);
    setShowPw1(false);
    setShowPw2(false);
  };

  const onChangePassword = async (): Promise<void> => {
    if (!canChangePassword) return;

    try {
      setChangingPw(true);

      // ✅ Re-auth (prevents “anyone on an open laptop” changing password silently)
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPw,
      });
      if (reauthErr) throw new Error('Current password is incorrect.');

      const { error: updErr } = await supabase.auth.updateUser({ password: pw1 });
      if (updErr) throw new Error(updErr.message);

      toast.success('Password updated ✅');
      clear();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Security</h3>
          <p className="text-sm text-gray-600 mt-1">Change your password while logged in.</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 border border-purple-100">
          <ShieldCheck className="h-5 w-5 text-purple-700" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-xs font-semibold text-gray-700">Current password</label>
          <div className="relative">
            <input
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              type={showCur ? 'text' : 'password'}
              placeholder="Enter your current password"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              type="button"
              onClick={() => setShowCur((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-gray-50"
              aria-label="Toggle password visibility"
            >
              {showCur ? <EyeOff className="h-4 w-4 text-gray-600" /> : <Eye className="h-4 w-4 text-gray-600" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">New password</label>
          <div className="relative">
            <input
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              type={showPw1 ? 'text' : 'password'}
              placeholder="Enter a strong password"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              type="button"
              onClick={() => setShowPw1((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-gray-50"
              aria-label="Toggle password visibility"
            >
              {showPw1 ? <EyeOff className="h-4 w-4 text-gray-600" /> : <Eye className="h-4 w-4 text-gray-600" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Confirm password</label>
          <div className="relative">
            <input
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              type={showPw2 ? 'text' : 'password'}
              placeholder="Re-enter password"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              type="button"
              onClick={() => setShowPw2((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-gray-50"
              aria-label="Toggle password visibility"
            >
              {showPw2 ? <EyeOff className="h-4 w-4 text-gray-600" /> : <Eye className="h-4 w-4 text-gray-600" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <KeyRound className="h-4 w-4 text-purple-700" />
          <span>At least 8 characters, with uppercase, lowercase, and a number.</span>
        </div>

        {pw1.length > 0 || pw2.length > 0 ? (
          pwError ? (
            <p className="mt-2 text-xs font-semibold text-red-600">{pwError}</p>
          ) : (
            <p className="mt-2 text-xs font-semibold text-emerald-700">Looks good ✅</p>
          )
        ) : null}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={clear}
          disabled={changingPw && (pw1.length > 0 || pw2.length > 0 || currentPw.length > 0)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => void onChangePassword()}
          disabled={!canChangePassword}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <KeyRound className="h-4 w-4" />
          {changingPw ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </div>
  );
}

export default function AcademicStaffSettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const displayName = useMemo(() => {
    if (!profile) return '';
    return `${profile.first_name} ${profile.last_name}`.trim();
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      setLoading(true);

      const { data: userRes, error: userError } = await supabase.auth.getUser();
      const user = userRes.user;

      if (userError || !user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_file, main_role')
        .eq('id', user.id)
        .maybeSingle()
        .returns<ProfileRow>();

      if (cancelled) return;

      if (error) {
        toast.error(error.message);
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data ?? null);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const onPickAvatar = async (file: File): Promise<void> => {
    if (!profile) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Max file size is 2MB.');
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw new Error(uploadError.message);

      const avatar_file: StoredFile = { bucket: 'avatars', path };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_file, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (updateError) throw new Error(updateError.message);

      setProfile((prev) => (prev ? { ...prev, avatar_file } : prev));
      toast.success('Profile photo updated ✅');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading settings…</div>;
  }

  if (!profile) {
    return <div className="py-16 text-center text-gray-600">Profile not found.</div>;
  }

  // optional client-side sanity (real protection should be server-side)
  if (profile.main_role !== 'academic_staff') {
    return <div className="py-16 text-center text-gray-600">Unauthorized.</div>;
  }

  const avatarSrc = toPublicImageSrc(supabase, profile.avatar_file, '/avatar.png');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Manage your profile, photo, and security.</p>
      </div>

      {/* Photo */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Photo</h3>

        <div className="flex flex-wrap items-center gap-6">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
            <Image
              src={avatarSrc}
              alt="Profile photo"
              width={96}
              height={96}
              className="w-24 h-24 object-cover"
            />
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors cursor-pointer">
              <UploadCloud className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickAvatar(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>

            <p className="text-xs text-gray-500">PNG/JPG. Max 2MB.</p>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Account</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Full name</p>
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-semibold text-gray-900">{profile.email}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Role</p>
            <p className="text-sm font-semibold text-gray-900">{profile.main_role}</p>
          </div>
        </div>
      </div>

      {/* ✅ Security (reused + secure) */}
      <ChangePasswordCard email={profile.email} />
    </div>
  );
}
