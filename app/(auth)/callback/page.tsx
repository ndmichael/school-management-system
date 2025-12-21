'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PrimaryButton } from '@/components/shared/PrimaryButton';

type Status = 'loading' | 'error' | 'ready';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string>('Finishing sign-in...');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        // 1) If Supabase redirected with an error in the URL hash, show it.
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;

        const hashParams = new URLSearchParams(hash);
        const err = hashParams.get('error');
        const errDesc = hashParams.get('error_description');
        const errCode = hashParams.get('error_code');

        if (err || errCode) {
          setStatus('error');
          setMessage(
            errCode === 'otp_expired'
              ? 'This link is invalid or has expired. Ask an admin to resend your invite.'
              : errDesc || err || 'Authentication error.'
          );
          return;
        }

        // 2) Complete auth session:
        // - PKCE flow: ?code=...
        // - Implicit flow: #access_token=...&refresh_token=...
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus('error');
            setMessage(error.message);
            return;
          }
          // clean URL
          url.searchParams.delete('code');
          window.history.replaceState({}, '', url.toString());
        } else {
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) {
              setStatus('error');
              setMessage(error.message);
              return;
            }
            // clean hash
            window.history.replaceState({}, '', url.pathname + url.search);
          }
        }

        // 3) Confirm we have a session now
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) {
          setStatus('error');
          setMessage(sessErr.message);
          return;
        }

        if (!data.session) {
          setStatus('error');
          setMessage('No session found. Please request a new invite link.');
          return;
        }

        setStatus('ready');
        setMessage('Set your password to complete setup.');
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Unexpected error.');
      }
    };

    void run();
  }, [supabase]);

  const onSetPassword = async () => {
    if (busy) return;

    const p = password.trim();
    const c = confirm.trim();

    if (p.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (p !== c) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setBusy(true);
    setMessage('Updating password...');

    const { error } = await supabase.auth.updateUser({ password: p });

    if (error) {
      setBusy(false);
      setStatus('error');
      setMessage(error.message);
      return;
    }

    router.replace('/login');
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Account setup</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>

        {status === 'ready' && (
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-sm text-gray-700">New password</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700">Confirm password</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <PrimaryButton
              onClick={onSetPassword}
              disabled={busy}
              loading={busy}
              className="w-full"
              rightIcon={null}
              type="button"
            >
              Set password
            </PrimaryButton>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 text-xs text-gray-500">
            If this is an invite link, ask your admin to resend a new one (old links are one-time).
          </div>
        )}
      </div>
    </div>
  );
}
