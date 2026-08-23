'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth';
import { useUser } from '@/lib/user-context';
import { useFocusTrap } from '@/components/admin/use-focus-trap';
import {
  IconAudit,
  IconChevronRight,
  IconClose,
  IconCollapse,
  IconContent,
  IconCoupons,
  IconCustomers,
  IconDashboard,
  IconExpand,
  IconLogout,
  IconMedia,
  IconMenu,
  IconOrders,
  IconProducts,
  IconQueues,
  IconStore,
} from '@/components/admin/icons';

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'OVERVIEW',
    items: [{ href: '/admin', label: 'DASHBOARD', icon: IconDashboard }],
  },
  {
    label: 'COMMERCE',
    items: [
      { href: '/admin/orders', label: 'ORDERS', icon: IconOrders },
      { href: '/admin/products', label: 'PRODUCTS', icon: IconProducts },
      { href: '/admin/customers', label: 'CUSTOMERS', icon: IconCustomers },
      { href: '/admin/coupons', label: 'COUPONS', icon: IconCoupons },
    ],
  },
  {
    label: 'STOREFRONT',
    items: [
      { href: '/admin/content', label: 'CONTENT', icon: IconContent },
      { href: '/admin/media', label: 'MEDIA', icon: IconMedia },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/admin/audit-log', label: 'AUDIT LOG', icon: IconAudit },
      { href: '/admin/queues', label: 'QUEUES', icon: IconQueues },
    ],
  },
];

const SECTION_TITLES: Record<string, string> = {
  orders: 'ORDERS',
  products: 'PRODUCTS',
  customers: 'CUSTOMERS',
  coupons: 'COUPONS',
  content: 'CONTENT',
  media: 'MEDIA LIBRARY',
  'audit-log': 'AUDIT LOG',
  queues: 'QUEUES',
};

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function resolveRoute(pathname: string): { crumbs: { label: string; href?: string }[]; title: string } {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return { crumbs: [{ label: 'DASHBOARD' }], title: 'DASHBOARD' };
  }
  const section = segments[1];
  const sectionTitle = SECTION_TITLES[section] ?? section.replace(/-/g, ' ').toUpperCase();
  const crumbs: { label: string; href?: string }[] = [
    { label: sectionTitle, href: `/admin/${section}` },
  ];
  let title = sectionTitle;
  if (segments.length >= 3) {
    const id = decodeURIComponent(segments[2]);
    let label: string;
    switch (section) {
      case 'orders':
        label = `#${id}`;
        break;
      case 'products':
        label = 'EDIT PRODUCT';
        break;
      case 'customers':
        label = `#${shortId(id)}`;
        break;
      case 'content':
        label = id.replace(/_/g, ' ').toUpperCase();
        break;
      default:
        label = shortId(id);
    }
    crumbs.push({ label });
    title = label;
  }
  return { crumbs, title };
}

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return initials || '?';
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const drawerTrapRef = useFocusTrap<HTMLDivElement>(drawerOpen, () => setDrawerOpen(false));

  useEffect(() => {
    const read = () => {
      try {
        setCollapsed(window.localStorage.getItem('shinobi-admin-sidebar') === 'collapsed');
      } catch {
        // Storage unavailable — collapse state stays in memory only.
      }
    };
    const timer = window.setTimeout(read, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('shinobi-admin-sidebar', next ? 'collapsed' : 'open');
      } catch {
        // Storage unavailable — collapse state stays in memory only.
      }
      return next;
    });
  };

  // The public store navbar is mounted by the root layout on every route. On
  // admin routes this shell owns the full canvas above it, so the navbar is
  // covered visually and marked inert at runtime to drop it from keyboard and
  // screen-reader order until the user leaves /admin.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const outsideNavs = Array.from(document.querySelectorAll<HTMLElement>('nav')).filter(
      (nav) => !root.contains(nav),
    );
    outsideNavs.forEach((nav) => nav.setAttribute('inert', ''));
    return () => {
      outsideNavs.forEach((nav) => nav.removeAttribute('inert'));
    };
  }, []);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authApi.logout();
    } catch {
      // Session may already be gone; clear locally regardless.
    }
    setUser(null);
    router.replace('/account/login');
  };

  const route = useMemo(() => resolveRoute(pathname), [pathname]);

  const navLinks = (options: { collapsed: boolean; onNavigate?: () => void }) =>
    NAV_GROUPS.map((group) => (
      <div key={group.label}>
        {options.collapsed ? (
          <div aria-hidden="true" className="mx-3 my-3 border-t border-[#1D1D2A]" />
        ) : (
          <p className="px-3 pb-1.5 pt-5 font-cinzel text-[10px] font-bold uppercase tracking-[0.22em] text-[#6B6B80] first:pt-1">
            {group.label}
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          {group.items.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={options.onNavigate}
                aria-current={active ? 'page' : undefined}
                title={options.collapsed ? item.label : undefined}
                className={`relative flex min-h-[44px] items-center gap-3 rounded-lg font-cinzel text-[13px] font-bold tracking-wider transition-colors ${
                  options.collapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  active
                    ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'text-[#9B9BB0] hover:bg-[#12121A] hover:text-[#F0F0F0]'
                }`}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#FF6B00]"
                  />
                ) : null}
                <Icon className="h-5 w-5 shrink-0" />
                {!options.collapsed ? item.label : <span className="sr-only">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    ));

  const userBlock = (compact: boolean) => (
    <div className={`flex items-center gap-3 border-t border-[#1D1D2A] px-4 py-4 ${compact ? 'justify-center px-0' : ''}`}>
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 font-cinzel text-xs font-bold text-[#FF6B00]"
      >
        {initialsOf(user?.fullName ?? '', user?.email ?? '')}
      </span>
      {!compact ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#F0F0F0]">{user?.fullName}</p>
          <p className="truncate text-xs uppercase tracking-wider text-[#6B6B80]">
            {(user?.role ?? '').replace(/_/g, ' ')}
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div ref={rootRef} className="min-h-screen bg-[#0A0A0F] text-[#F0F0F0]">
      {/* Admin owns the full viewport canvas on /admin routes. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[45] bg-[#0A0A0F]" />

      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-[#FF6B00] focus:px-4 focus:py-2 focus:font-cinzel focus:text-xs focus:font-bold focus:text-[#160B02]"
      >
        SKIP TO CONTENT
      </a>

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-[#2A2A3A] bg-[#0C0C13] transition-[width] duration-200 motion-reduce:transition-none lg:flex ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-[#1D1D2A] ${
            collapsed ? 'justify-center' : 'px-5'
          }`}
        >
          <Link
            href="/admin"
            className="flex min-h-[44px] items-center gap-2.5"
            aria-label="Shinobi HQ dashboard"
          >
            <span aria-hidden="true" className="relative grid h-7 w-7 shrink-0 place-items-center">
              <span className="absolute inset-0 rotate-45 rounded-[6px] border-2 border-[#FF6B00]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFB800]" />
            </span>
            {!collapsed ? (
              <span className="font-bebas text-2xl leading-none tracking-wide text-[#F0F0F0]">
                SHINOBI <span className="text-[#FF6B00]">HQ</span>
              </span>
            ) : null}
          </Link>
        </div>
        <nav aria-label="Admin sections" className={`flex-1 overflow-y-auto pb-4 ${collapsed ? 'px-2 pt-2' : 'px-3 pt-2'}`}>
          {navLinks({ collapsed })}
        </nav>
        {userBlock(collapsed)}
      </aside>

      {/* Off-canvas drawer (<lg) */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div
            ref={drawerTrapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[#2A2A3A] bg-[#0C0C13]"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#1D1D2A] pl-5 pr-3">
              <span className="font-bebas text-2xl leading-none tracking-wide text-[#F0F0F0]">
                SHINOBI <span className="text-[#FF6B00]">HQ</span>
              </span>
              <button
                type="button"
                data-autofocus
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="grid h-11 w-11 place-items-center rounded-lg text-[#6B6B80] transition-colors hover:text-[#F0F0F0]"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
              {navLinks({ collapsed: false, onNavigate: () => setDrawerOpen(false) })}
            </nav>
            <div className="border-t border-[#1D1D2A]">
              {userBlock(false)}
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={signingOut}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#CC0000]/50 px-4 font-cinzel text-xs font-bold uppercase tracking-wider text-[#FF6B6B] transition-colors hover:bg-[#CC0000]/10 disabled:opacity-50"
                >
                  <IconLogout className="h-4 w-4" />
                  {signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 motion-reduce:transition-none ${
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-[#2A2A3A] bg-[#0C0C13]/95 px-3 backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#B8B8CC] transition-colors hover:bg-[#12121A] hover:text-[#F0F0F0] lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            className="hidden h-11 w-11 shrink-0 place-items-center rounded-lg text-[#6B6B80] transition-colors hover:bg-[#12121A] hover:text-[#F0F0F0] lg:grid"
          >
            {collapsed ? <IconExpand className="h-5 w-5" /> : <IconCollapse className="h-5 w-5" />}
          </button>

          <div className="min-w-0 flex-1 pl-1">
            <nav aria-label="Breadcrumb" className="truncate">
              <ol className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#6B6B80]">
                <li>
                  <Link href="/admin" className="transition-colors hover:text-[#FF6B00]">
                    HQ
                  </Link>
                </li>
                {route.crumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                    <IconChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 opacity-60" />
                    {crumb.href && index < route.crumbs.length - 1 ? (
                      <Link href={crumb.href} className="truncate transition-colors hover:text-[#FF6B00]">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="location" className="truncate">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <p className="truncate font-cinzel text-sm font-bold tracking-wider text-[#F0F0F0]">
              {route.title}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#2A2A3A] px-3 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0]"
            >
              <IconStore className="h-4 w-4" />
              <span className="hidden md:inline">STORE</span>
            </Link>
            <span aria-hidden="true" className="hidden h-6 w-px bg-[#2A2A3A] sm:block" />
            <Link
              href="/account"
              className="flex h-11 min-w-[44px] items-center gap-2.5 rounded-lg px-1.5 transition-colors hover:bg-[#12121A]"
              title="My account"
            >
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 font-cinzel text-xs font-bold text-[#FF6B00]"
              >
                {initialsOf(user?.fullName ?? '', user?.email ?? '')}
              </span>
              <span className="hidden min-w-0 flex-col items-start xl:flex">
                <span className="max-w-[160px] truncate text-sm font-semibold leading-tight text-[#F0F0F0]">
                  {user?.fullName}
                </span>
                <span className="text-[10px] uppercase tracking-wider leading-tight text-[#6B6B80]">
                  {(user?.role ?? '').replace(/_/g, ' ')}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              aria-label={signingOut ? 'Signing out…' : 'Sign out'}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#6B6B80] transition-colors hover:bg-[#CC0000]/10 hover:text-[#FF6B6B] disabled:opacity-50"
            >
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main
          id="admin-main"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
