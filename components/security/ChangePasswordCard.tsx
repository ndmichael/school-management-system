'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

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

type Props = {
  email: string; // needed for re-auth
  requireCurrentPassword?: boolean; // default true (recommended)
};

export default function ChangePasswordCard({
  email,
  requireCurrentPassword = true,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [currentPw, setCurrentPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [changing, setChanging] = useState(false);

  const pwError = useMemo(() => {
    if (pw1 !== pw2) return 'Passwords do not match.';
    return validatePassword(pw1);
  }, [pw1, pw2]);

  const canSubmit = useMemo(() => {
    if (changing) return false;
    if (requireCurrentPassword && currentPw.trim().length === 0) return false;
    if (pw1.trim().length === 0 || pw2.trim().length === 0) return false;
    if (pwError !== null) return false;
    return true;
  }, [changing, requireCurrentPassword, currentPw, pw1, pw2, pwError]);

  const clear = () => {
    setCurrentPw('');
    setPw1('');
    setPw2('');
    setShowCur(false);
    setShowPw1(false);
    setShowPw2(false);
  };

  const onChangePassword = async (): Promise<void> => {
    if (!canSubmit) return;

    try {
      setChanging(true);

      // ✅ Re-auth (recommended for staff/admin)
      if (requireCurrentPassword) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password: currentPw,
        });
        if (signInErr) throw new Error('Current password is incorrect.');
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: pw1 });
      if (updErr) throw new Error(updErr.message);

      toast.success('Password updated ✅');
      clear();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setChanging(false);
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
        {requireCurrentPassword ? (
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
        ) : null}

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
          disabled={changing && (pw1.length > 0 || pw2.length > 0 || currentPw.length > 0)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => void onChangePassword()}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <KeyRound className="h-4 w-4" />
          {changing ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </div>
  );
}
