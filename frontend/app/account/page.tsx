'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';

/**
 * Account home (Phase 5): profile + sign-out. Orders arrive in Phase 6 —
 * the placeholder keeps the IA stable from day one.
 */
export default function AccountPage() {
  const router = useRouter();
  const { user, loading, refresh } = useUser();
  const [signingOut, setSigningOut] = useState(false);

  // Protected-route UX: bounce to login preserving the intended destination.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/account/login?next=/account');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6B6B80] font-cinzel" role="status" aria-live="polite">
          Checking credentials…
        </p>
      </main>
    );
  }

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:5000'
        }/api/v1/auth/logout`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'x-csrf-token': '1' },
        },
      );
      await refresh();
      router.push('/');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-10">
        <h1 className="font-bebas text-5xl tracking-wide text-[#F0F0F0]">MY ACCOUNT</h1>
        <p className="mt-2 text-sm text-[#B8B8CC]">Signed in as {user.email}</p>
      </header>

      <section aria-labelledby="profile-heading" className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-6 mb-6">
        <h2 id="profile-heading" className="font-cinzel text-lg font-bold text-[#F0F0F0] mb-4">
          Profile
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-[#6B6B80]">Name</dt>
          <dd className="text-[#F0F0F0]">{user.fullName}</dd>
          <dt className="text-[#6B6B80]">Email</dt>
          <dd className="text-[#F0F0F0]">{user.email}</dd>
        </dl>
      </section>

      <section aria-labelledby="orders-heading" className="rounded-xl border border-dashed border-[#2A2A3A] bg-[#12121A] p-6 mb-8">
        <h2 id="orders-heading" className="font-cinzel text-lg font-bold text-[#B8B8CC] mb-2">
          Orders
        </h2>
        <p className="text-sm text-[#6B6B80]">
          Order history unlocks with checkout.{' '}
          <Link href="/products" className="text-[#FF6B00] underline underline-offset-4">
            Keep browsing
          </Link>{' '}
          in the meantime.
        </p>
      </section>

      <div className="flex gap-3">
        <button
          onClick={signOut}
          disabled={signingOut}
          className="rounded-lg border border-[#CC0000]/50 px-6 py-2.5 font-cinzel text-sm font-bold text-[#F0F0F0] hover:border-[#CC0000] focus-visible:outline-none transition-colors disabled:opacity-50"
        >
          {signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
        </button>
      </div>
    </main>
  );
}
