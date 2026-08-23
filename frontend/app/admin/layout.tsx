'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';

const NAV_ITEMS = [
  { href: '/admin', label: 'DASHBOARD' },
  { href: '/admin/orders', label: 'ORDERS' },
  { href: '/admin/products', label: 'PRODUCTS' },
  { href: '/admin/content', label: 'CONTENT' },
  { href: '/admin/media', label: 'MEDIA' },
  { href: '/admin/customers', label: 'CUSTOMERS' },
  { href: '/admin/coupons', label: 'COUPONS' },
  { href: '/admin/audit-log', label: 'AUDIT LOG' },
  { href: '/admin/queues', label: 'QUEUES' },
];

/**
 * UX-only gate: the real authorization happens server-side on every /admin
 * API route. This shell only hides the chrome from non-staff browsers.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/account/login?next=/admin');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="font-cinzel text-[#6B6B80]" role="status" aria-live="polite">
          Checking credentials…
        </p>
      </div>
    );
  }

  if (user.role === 'customer') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row">
      <aside className="shrink-0 border-b border-[#2A2A3A] px-4 py-5 sm:px-6 md:w-60 md:border-b-0 md:border-r md:py-10 md:pr-6 lg:pl-2">
        <p className="font-bebas text-2xl tracking-wide text-[#F0F0F0]">SHINOBI HQ</p>
        <nav aria-label="Admin sections" className="mt-4 flex gap-1 overflow-x-auto md:mt-6 md:flex-col">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 font-cinzel text-sm font-bold tracking-wider transition-colors ${
                  active ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-[#B8B8CC] hover:text-[#F0F0F0]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-8 hidden break-all text-xs leading-relaxed text-[#6B6B80] md:block">
          {user.email}
          <br />
          {user.role.replace(/_/g, ' ')}
        </p>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 md:py-10 md:pl-8 lg:pl-10">{children}</main>
    </div>
  );
}
