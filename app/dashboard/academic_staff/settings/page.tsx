'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  main_role: 'admin' | 'student' | 'academic_staff' | 'non_academic_staff';
};

const supabase = createClient();

const getPublicAvatarUrl = (path: string): string => {
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
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

export default function AcademicStaffSettingsPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [uploading, setUploading] = useState<boolean>(false);

  // password UI state
  const [pw1, setPw1] = useState<string>('');
  const [pw2, setPw2] = useState<string>('');
  const [showPw1, setShowPw1] = useState<boolean>(false);
  const [showPw2, setShowPw2] = useState<boolean>(false);
  const [changingPw, setChangingPw] = useState<boolean>(false);

  const displayName = useMemo(() => {
    if (!profile) return '';
    return `${profile.first_name} ${profile.last_name}`.trim();
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, main_role')
        .eq('id', user.id)
        .maybeSingle()
        .returns<ProfileRow>();

      if (!cancelled) {
        if (!error && data) setProfile(data);
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

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
      const filePath = `${profile.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', profile.id);

      if (updateError) throw new Error(updateError.message);

      setProfile(prev => (prev ? { ...prev, avatar_url: filePath } : prev));
      toast.success('Profile photo updated ✅');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const canChangePassword = useMemo(() => {
    if (pw1.trim().length === 0 || pw2.trim().length === 0) return false;
    if (pw1 !== pw2) return false;
    if (validatePassword(pw1) !== null) return false;
    return true;
  }, [pw1, pw2]);

  const onChangePassword = async (): Promise<void> => {
    if (changingPw || !canChangePassword) return;

    setChangingPw(true);

    const req = supabase.auth.updateUser({ password: pw1 });

    toast.promise(
      req.then(({ error }) => {
        if (error) throw new Error(error.message);
        return true;
      }),
      {
        pending: 'Updating password…',
        success: 'Password updated ✅',
        error: {
          render({ data }) {
            return data instanceof Error ? data.message : 'Failed to update password';
          },
        },
      }
    );

    try {
      const { error } = await req;
      if (error) throw new Error(error.message);

      setPw1('');
      setPw2('');
      setShowPw1(false);
      setShowPw2(false);
    } catch {
      // toast already handled
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading settings…</div>;
  }

  if (!profile) {
    return <div className="py-16 text-center text-gray-600">Profile not found.</div>;
  }

  const avatarSrc = profile.avatar_url ? getPublicAvatarUrl(profile.avatar_url) : null;

  const pwError =
    pw1 !== pw2 ? 'Passwords do not match.' : validatePassword(pw1);

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
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt="Profile photo"
                width={96}
                height={96}
                className="w-24 h-24 object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-500">No photo</span>
            )}
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

      {/* Security */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Security</h3>
            <p className="text-sm text-gray-600 mt-1">
              Change your password while logged in.
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 border border-purple-100">
            <ShieldCheck className="h-5 w-5 text-purple-700" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                onClick={() => setShowPw1(v => !v)}
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
                onClick={() => setShowPw2(v => !v)}
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
            onClick={() => {
              setPw1('');
              setPw2('');
              setShowPw1(false);
              setShowPw2(false);
            }}
            disabled={changingPw || (pw1.length === 0 && pw2.length === 0)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => void onChangePassword()}
            disabled={!canChangePassword || changingPw}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <KeyRound className="h-4 w-4" />
            {changingPw ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  );
}
