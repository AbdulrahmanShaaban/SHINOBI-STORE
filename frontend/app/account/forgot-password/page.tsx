'use client';

import { useState } from 'react';
import AuthCard, { buttonClass, inputClass } from '@/components/auth/AuthCard';
import { authApi } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Uniform response regardless of account existence (§12).
      await authApi.forgotPassword(email);
    } catch {
      // Swallowed deliberately — the confirmation copy is identical either way.
    } finally {
      setSent(true);
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title="CHECK YOUR SCROLLS"
        subtitle="If an account exists for that email, a reset link is on its way. The link works once and expires in 30 minutes."
        footer={{ text: 'Remembered it?', href: '/account/login', linkText: 'Back to sign in' }}
      >
        <p className="text-sm text-[#6B6B80]">
          Didn&apos;t receive anything? Request another reset from the sign-in page.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="RECOVER YOUR ACCOUNT"
      subtitle="Enter your email and we'll send a single-use reset link."
      footer={{ text: 'Remembered it?', href: '/account/login', linkText: 'Back to sign in' }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="forgot-email" className="block text-xs font-cinzel font-bold text-[#B8B8CC] mb-1">
            EMAIL
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? 'SENDING…' : 'SEND RESET LINK'}
        </button>
      </form>
    </AuthCard>
  );
}
