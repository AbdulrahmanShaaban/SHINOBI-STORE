'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi, type CustomerDetail } from '@/lib/admin-api';
import { useUser } from '@/lib/user-context';
import { formatPrice } from '@/lib/money';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import EventTimeline from '@/components/admin/EventTimeline';
import SectionCard from '@/components/admin/SectionCard';
import { SkeletonText } from '@/components/admin/Skeleton';
import StatTile from '@/components/admin/StatTile';
import StatusBadge, { toneForStatus } from '@/components/admin/StatusBadge';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import { formatDateTime } from '@/components/admin/format';
import { inputClass, labelClass } from '@/components/admin/ui';

const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'refunded', 'failed']);

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user: viewer } = useUser();

  const canBan = viewer?.role === 'admin' || viewer?.role === 'super_admin';

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    adminApi
      .getCustomer(id)
      .then((c) => {
        if (!alive) return;
        setCustomer(c);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load the customer.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, retryNonce]);

  const retry = () => setRetryNonce((n) => n + 1);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const ban = async () => {
    if (!customer || banning) return;
    setBanning(true);
    setBanError(null);
    try {
      await adminApi.banCustomer(id, banReason.trim());
      setBanOpen(false);
      setBanReason('');
      setFlash(true);
      adminApi
        .getCustomer(id)
        .then(setCustomer)
        .catch(() => undefined);
    } catch (err: unknown) {
      setBanError(err instanceof Error ? err.message : 'Could not ban this account.');
    } finally {
      setBanning(false);
    }
  };

  if (loading && !customer) {
    return (
      <div className="max-w-4xl space-y-6" role="status" aria-live="polite">
        <span className="sr-only">Loading customer…</span>
        <SkeletonText lines={1} className="max-w-xs" />
        <div className="h-24 animate-pulse rounded-xl bg-[#16161F]" />
        <div className="h-72 animate-pulse rounded-xl bg-[#16161F]" />
      </div>
    );
  }

  if (loadError || !customer) {
    return (
      <div>
        <Link
          href="/admin/customers"
          className="mb-5 inline-flex min-h-[44px] items-center gap-2 font-cinzel text-sm font-bold text-[#FF6B00] hover:underline underline-offset-4"
        >
          ← BACK TO CUSTOMERS
        </Link>
        <ErrorState
          message={loadError ?? 'Customer not found.'}
          onRetry={loadError ? retry : undefined}
        />
      </div>
    );
  }

  const lifetimeSpend = customer.orders
    .filter((o) => !CANCELLED_STATUSES.has(o.status))
    .reduce((sum, o) => sum + o.totalCents, 0);

  const activity = [...customer.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/customers"
        className="mb-5 inline-flex min-h-[44px] items-center gap-2 font-cinzel text-sm font-bold text-[#FF6B00] hover:underline underline-offset-4"
      >
        ← BACK TO CUSTOMERS
      </Link>

      <header className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-[#2A2A3A] bg-[#16161F] px-5 py-4">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 font-cinzel text-sm font-bold text-[#FF6B00]"
        >
          {(customer.fullName.trim() || customer.email)
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('')}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-bebas text-3xl tracking-wide text-[#F0F0F0] sm:text-4xl">
            {customer.fullName}
          </h1>
          <p className="break-all text-sm text-[#6B6B80]">{customer.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={customer.isActive ? 'active' : 'banned'} />
          {canBan && customer.isActive ? (
            <button
              type="button"
              onClick={() => {
                setBanOpen(true);
                setBanError(null);
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#CC0000]/60 px-4 font-cinzel text-xs font-bold uppercase tracking-wider text-[#FF6B6B] transition-colors hover:bg-[#CC0000]/10"
            >
              BAN ACCOUNT
            </button>
          ) : null}
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="ORDERS" value={customer.orders.length} accent="accent" />
        <StatTile label="LIFETIME SPEND" value={formatPrice(lifetimeSpend)} accent="money" />
        <StatTile label="ROLE" value={customer.role.replace(/_/g, ' ')} />
        <StatTile
          label="MEMBER SINCE"
          value={new Date(customer.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          hint={formatDateTime(customer.createdAt)}
        />
      </div>

      <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border border-[#2A2A3A] bg-[#12121A] p-5 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
        <dt className="text-[#6B6B80]">Email</dt>
        <dd className="break-all">{customer.email}</dd>
        <dt className="text-[#6B6B80]">Joined</dt>
        <dd>{formatDateTime(customer.createdAt)}</dd>
      </dl>

      {flash ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-8 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
        >
          Account updated.
        </p>
      ) : null}

      {!customer.isActive ? (
        <SectionCard title="ACCESS REVOKED" tone="danger" className="mb-8">
          <p className="text-sm text-[#B8B8CC]">
            This account is banned and can no longer sign in.
          </p>
        </SectionCard>
      ) : null}

      <section aria-labelledby="activity-heading" className="mb-8">
        <h2 id="activity-heading" className="mb-4 font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]">
          ACTIVITY
        </h2>
        {activity.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState
              title="NO ACTIVITY YET"
              description="This customer hasn't placed any orders."
            />
          </div>
        ) : (
          <EventTimeline
            highlightLast={false}
            items={activity.map((o) => ({
              id: o.orderNumber,
              title: `#${o.orderNumber}`,
              href: `/admin/orders/${encodeURIComponent(o.orderNumber)}`,
              subtitle: <StatusBadge status={o.status} />,
              meta: `${formatDateTime(o.createdAt)} · ${formatPrice(o.totalCents)}`,
              tone: toneForStatus(o.status) === 'neutral' ? undefined : toneForStatus(o.status),
            }))}
          />
        )}
      </section>

      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="mb-3 font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]">
          ORDER HISTORY
        </h2>
        {customer.orders.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState title="NO ORDERS" description="Orders will appear here after checkout." />
          </div>
        ) : (
        <AdminTable headers={['ORDER', 'STATUS', 'TOTAL', 'PLACED']} caption="This customer's orders" zebra>
          {customer.orders.map((o) => (
            <TableRow key={o.orderNumber}>
              <td className="px-4 py-3 align-middle text-sm">
                <Link
                  href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                  className="font-mono text-xs text-[#FF6B00] hover:underline underline-offset-4"
                >
                  {o.orderNumber}
                </Link>
              </td>
              <td className="px-4 py-3 align-middle text-sm">
                <StatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3 align-middle text-sm text-[#FFB800]">{formatPrice(o.totalCents)}</td>
              <td className="whitespace-nowrap px-4 py-3 align-middle text-sm">{formatDateTime(o.createdAt)}</td>
            </TableRow>
          ))}
        </AdminTable>
        )}
      </section>

      <ConfirmDialog
        open={banOpen}
        title={`BAN ${customer.email}?`}
        description="Banning immediately revokes sign-in for this account. The reason is stored in the audit trail."
        tone="danger"
        confirmLabel="CONFIRM BAN"
        busyLabel="BANNING…"
        busy={banning}
        confirmDisabled={banReason.trim() === ''}
        onClose={() => {
          setBanOpen(false);
          setBanError(null);
        }}
        onConfirm={() => void ban()}
      >
        <div>
          <label htmlFor="ban-reason" className={labelClass}>
            REASON (REQUIRED)
          </label>
          <input
            id="ban-reason"
            data-autofocus
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            required
            placeholder="Why is this account being banned?"
            className={inputClass}
          />
        </div>
        {banError ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
            {banError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
