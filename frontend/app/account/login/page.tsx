'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthCard, { buttonClass, inputClass } from '@/components/auth/AuthCard';
import { authApi, mergeGuestCart, AuthError } from '@/lib/auth';
import { useUser } from '@/lib/user-context';
import { useCartStore } from '@/lib/cart-store';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setEmailNotVerified(false);
    try {
      const user = await authApi.login({ email, password });

      // §Phase5: merge the guest cart at login. Untrusted server-side — the
      // API re-validates every variant and clamps quantities. On success the
      // guest lines are dropped (they now live in the server cart).
      const guestLines = useCartStore.getState().lines;
      if (guestLines.length > 0) {
        const merged = await mergeGuestCart(
          guestLines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        );
        if (merged) {
          for (const line of guestLines) useCartStore.getState().removeLine(line.variantId);
        }
      }

      setUser(user);
      const next = searchParams.get('next');
      router.push(next && next.startsWith('/') ? next : '/account');
    } catch (err) {
      if (err instanceof AuthError && err.code === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
        setError(null);
      } else {
        setError(
          err instanceof AuthError && err.status < 500
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const onResendVerification = async () => {
    setResendBusy(true);
    try {
      await authApi.resendVerification(email);
      setResendDone(true);
    } catch {
      setError('Failed to resend. Please try again.');
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <AuthCard
      title="RETURN TO THE HIDDEN LEAF"
      subtitle="Sign in to your Shinobi Store account."
      footer={{ text: 'New here?', href: '/account/register', linkText: 'Create an account' }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
            {error}
          </p>
        ) : null}
        {emailNotVerified ? (
          <div role="alert" className="rounded-lg border border-[#FF6B00]/50 bg-[#FF6B00]/10 px-4 py-3 text-sm text-[#F0F0F0]">
            <p className="font-bold mb-1">Please verify your email first</p>
            {resendDone ? (
              <p className="text-[#B8B8CC]">Verification email sent. Check your inbox.</p>
            ) : (
              <button
                type="button"
                onClick={onResendVerification}
                disabled={resendBusy}
                className="text-[#FF6B00] underline underline-offset-4 hover:text-[#FFB800] disabled:opacity-50"
              >
                {resendBusy ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
          </div>
        ) : null}
        <div>
          <label htmlFor="login-email" className="block text-xs font-cinzel font-bold text-[#B8B8CC] mb-1">
            EMAIL
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="login-password" className="block text-xs font-cinzel font-bold text-[#B8B8CC]">
              PASSWORD
            </label>
            <Link href="/account/forgot-password" className="text-xs text-[#6B6B80] hover:text-[#FF6B00] underline underline-offset-4">
              Forgot it?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? 'SIGNING IN...' : 'SIGN IN'}
        </button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
