'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud } from 'lucide-react';

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

export default function AcademicStaffSettingsPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);

  const displayName = useMemo(() => {
    if (!profile) return '';
    return `${profile.first_name} ${profile.last_name}`.trim();
  }, [profile]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, main_role')
        .eq('id', user.id)
        .maybeSingle()
        .returns<ProfileRow>();

      if (!error && data) setProfile(data);
      setLoading(false);
    };

    load();
  }, []);

  const onPickAvatar = async (file: File): Promise<void> => {
    if (!profile) return;

    // Basic guardrails
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Max file size is 2MB.');
      return;
    }

    setUploading(true);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${profile.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      setUploading(false);
      alert(uploadError.message);
      return;
    }

    // If bucket public, store the storage path OR public URL.
    // I recommend storing the STORAGE PATH so you can change public/private later.
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: filePath })
      .eq('id', profile.id);

    if (updateError) {
      setUploading(false);
      alert(updateError.message);
      return;
    }

    setProfile(prev => (prev ? { ...prev, avatar_url: filePath } : prev));
    setUploading(false);
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading settings…</div>;
  }

  if (!profile) {
    return <div className="py-16 text-center text-gray-600">Profile not found.</div>;
  }

  const avatarSrc = profile.avatar_url ? getPublicAvatarUrl(profile.avatar_url) : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Manage your profile and photo.</p>
      </div>

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
    </div>
  );
}
