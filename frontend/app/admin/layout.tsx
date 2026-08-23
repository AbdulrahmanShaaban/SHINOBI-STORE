'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import AdminShell from '@/components/admin/AdminShell';

/**
 * UX-only gate: the real authorization happens server-side on every /admin
 * API route. This shell only hides the chrome from non-staff browsers.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/account/login?next=/admin');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <p className="font-cinzel text-[#6B6B80]" role="status" aria-live="polite">
          Checking credentials…
        </p>
      </div>
    );
  }

  if (user.role === 'customer') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <section className="max-w-md rounded-xl border border-[#2A2A3A] bg-[#16161F] p-8 text-center">
          <h1 className="font-bebas text-4xl tracking-wide text-[#F0F0F0]">
            STAFF ACCESS REQUIRED
          </h1>
          <p className="mt-3 text-sm text-[#B8B8CC]">
            This area is limited to Shinobi Store staff accounts.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-[#FF6B00]/60 bg-[#FF6B00]/10 px-6 py-2.5 font-cinzel text-sm font-bold text-[#FF6B00] transition-colors hover:bg-[#FF6B00]/20"
          >
            BACK TO THE STORE
          </Link>
        </section>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
