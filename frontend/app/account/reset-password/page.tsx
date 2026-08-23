'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthCard, { buttonClass, inputClass } from '@/components/auth/AuthCard';
import { authApi, AuthError } from '@/lib/auth';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => router.push('/account/login'), 2500);
    } catch (err) {
      setError(
        err instanceof AuthError && err.status < 500 ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (!token && !done) {
    return (
      <AuthCard title="MISSING TOKEN" subtitle="This page needs a valid reset link.">
        <p className="text-sm text-[#6B6B80]">
          Request a fresh link from the forgot-password page.
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title="PASSWORD UPDATED"
        subtitle="All existing sessions were signed out for safety. Sign in with your new password."
        footer={{ text: 'Ready?', href: '/account/login', linkText: 'Sign in' }}
      >
        <span />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="SET A NEW PASSWORD" subtitle={`Minimum 10 characters with letters and numbers.`}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="reset-password" className="block text-xs font-cinzel font-bold text-[#B8B8CC] mb-1">
            NEW PASSWORD
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="reset-confirm" className="block text-xs font-cinzel font-bold text-[#B8B8CC] mb-1">
            CONFIRM PASSWORD
          </label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? 'SAVING…' : 'UPDATE PASSWORD'}
        </button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
