'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';

/**
 * Account home: centered profile hub. Orders live at /account/orders.
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

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
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

  if (loading || !user) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6B6B80] font-cinzel" role="status" aria-live="polite">
          Checking credentials…
        </p>
      </main>
    );
  }

  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      {/* Profile header */}
      <section
        aria-labelledby="profile-heading"
        className="rounded-2xl border border-[#2A2A3A] bg-[#16161F] p-8 text-center"
      >
        <span
          aria-hidden="true"
          className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 font-cinzel text-2xl font-bold text-[#FF6B00]"
        >
          {initials}
        </span>
        <h1 id="profile-heading" className="mt-4 text-2xl font-semibold text-[#F0F0F0]">
          {user.fullName}
        </h1>
        <p className="mt-1 text-sm text-[#6B6B80]">{user.email}</p>
        <span className="mt-3 inline-block rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-3 py-1 text-xs uppercase tracking-wider text-[#FF6B00]">
          {(user.role ?? 'customer').replace(/_/g, ' ')}
        </span>
      </section>

      {/* Quick links */}
      <section aria-label="Account shortcuts" className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/account/orders"
          className="group rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 text-center transition-colors hover:border-[#FF6B00]/60 focus-visible:outline-none focus-visible:border-[#FF6B00]"
        >
          <p className="font-semibold text-[#F0F0F0] group-hover:text-[#FF6B00] transition-colors">
            My Orders
          </p>
          <p className="mt-1 text-xs text-[#6B6B80]">Track purchases</p>
        </Link>
        <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 text-center opacity-60">
          <p className="font-semibold text-[#B8B8CC]">Addresses</p>
          <p className="mt-1 text-xs text-[#6B6B80]">Coming soon</p>
        </div>
        <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 text-center opacity-60">
          <p className="font-semibold text-[#B8B8CC]">Settings</p>
          <p className="mt-1 text-xs text-[#6B6B80]">Coming soon</p>
        </div>
      </section>

      {/* Sign out */}
      <div className="mt-10 text-center">
        <button
          onClick={signOut}
          disabled={signingOut}
          className="text-sm text-[#CC0000] underline underline-offset-4 hover:text-[#FF6B00] transition-colors disabled:opacity-50"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </main>
  );
}
