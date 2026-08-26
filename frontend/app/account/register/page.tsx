'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthCard, { buttonClass, inputClass } from '@/components/auth/AuthCard';
import { authApi, AuthError } from '@/lib/auth';

const PASSWORD_RULE = 'At least 10 characters with letters and numbers.';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.register({ email, password, fullName });
      // Uniform response — the account either exists now or already did.
      setDone(true);
    } catch (err) {
      setError(
        err instanceof AuthError && err.status < 500 ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard
        title="CHECK YOUR INBOX"
        subtitle="A verification link has been sent to your email. Please verify before signing in."
        footer={{ text: 'Already verified?', href: '/account/login', linkText: 'Sign in' }}
      >
        <Link href="/account/login" className={buttonClass + ' block text-center'}>
          GO TO SIGN IN
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="JOIN THE RANKS"
      subtitle="Create your Shinobi Store account."
      footer={{ text: 'Already a member?', href: '/account/login', linkText: 'Sign in' }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="reg-name" className="block text-xs font-cinzel font-bold text-[#B8B8CC] mb-1">
            NAME
          </label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            required
            maxLength={80}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="reg-email" className="block text-xs font-cinzel font-bold text-[#B8B8CC] mb-1">
            EMAIL
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-xs font-cinzel font-bold text-[#B8B8CC] mb-1">
            PASSWORD
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="reg-password-rule"
            className={inputClass}
          />
          <p id="reg-password-rule" className="mt-1 text-xs text-[#6B6B80]">
            {PASSWORD_RULE}
          </p>
        </div>
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? 'CREATING…' : 'CREATE ACCOUNT'}
        </button>
      </form>
    </AuthCard>
  );
}
