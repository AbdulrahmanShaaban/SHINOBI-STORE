'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi, type CustomerDetail } from '@/lib/admin-api';
import { useUser } from '@/lib/user-context';
import { formatPrice } from '@/lib/money';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatDateTime } from '@/components/admin/format';

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user: viewer } = useUser();

  const canBan = viewer?.role === 'admin' || viewer?.role === 'super_admin';

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  }, [id]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const ban = async () => {
    if (!customer) return;
    if (!window.confirm(`Ban ${customer.email}? They will no longer be able to sign in.`)) return;
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

  if (loading) {
    return (
      <p className="text-[#6B6B80]" role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (loadError || !customer) {
    return (
      <div>
        <Link href="/admin/customers" className="text-sm text-[#FF6B00] hover:underline underline-offset-4">
          ← Back to customers
        </Link>
        <p role="alert" className="mt-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {loadError ?? 'Customer not found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link href="/admin/customers" className="text-sm text-[#FF6B00] hover:underline underline-offset-4">
        ← Back to customers
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <h1 className="font-bebas text-4xl tracking-wide text-[#F0F0F0] sm:text-5xl">
          {customer.fullName}
        </h1>
        <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
      </header>

      <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
        <dt className="text-[#6B6B80]">Email</dt>
        <dd className="break-all">{customer.email}</dd>
        <dt className="text-[#6B6B80]">Role</dt>
        <dd>{customer.role.replace(/_/g, ' ')}</dd>
        <dt className="text-[#6B6B80]">Joined</dt>
        <dd>{formatDateTime(customer.createdAt)}</dd>
      </dl>

      {canBan ? (
        <section aria-labelledby="ban-heading" className="mb-8 rounded-xl border border-dashed border-[#CC0000]/40 bg-[#12121A] p-5">
          <h2 id="ban-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#CC0000]">
            DANGER ZONE
          </h2>

          {customer.isActive ? (
            banOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ban();
                }}
                className="max-w-xl space-y-3"
              >
                <label htmlFor="ban-reason" className="block text-xs font-cinzel font-bold text-[#B8B8CC]">
                  REASON (REQUIRED)
                  <input
                    id="ban-reason"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    required
                    placeholder="Why is this account being banned?"
                    className="mt-1 w-full rounded-lg border border-[#2A2A3A] bg-[#16161F] px-4 py-2.5 text-sm font-normal tracking-normal text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#CC0000] focus:outline-none"
                  />
                </label>
                {banError ? (
                  <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
                    {banError}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={banning || banReason.trim() === ''}
                    className="rounded-lg bg-[#CC0000] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-white transition-colors hover:bg-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {banning ? 'BANNING…' : 'CONFIRM BAN'}
                  </button>
                  <button
                    type="button"
                    disabled={banning}
                    onClick={() => {
                      setBanOpen(false);
                      setBanError(null);
                    }}
                    className="rounded-lg border border-[#2A2A3A] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:opacity-50"
                  >
                    DISMISS
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setBanOpen(true)}
                disabled={!customer.isActive}
                className="rounded-lg border border-[#CC0000]/60 px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-[#F0F0F0] transition-colors hover:border-[#CC0000] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                BAN ACCOUNT
              </button>
            )
          ) : (
            <p className="text-sm text-[#6B6B80]">This account is already banned.</p>
          )}
        </section>
      ) : null}

      {flash ? (
        <p role="status" aria-live="polite" className="mb-8 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          Account updated.
        </p>
      ) : null}

      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          ORDERS
        </h2>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-[#6B6B80]">No orders yet.</p>
        ) : (
          <AdminTable headers={['ORDER', 'STATUS', 'TOTAL', 'PLACED']}>
            {customer.orders.map((o) => (
              <TableRow key={o.orderNumber}>
                <td className={td}>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                    className="font-mono text-xs text-[#FF6B00] hover:underline underline-offset-4"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className={td}>
                  <StatusBadge status={o.status} />
                </td>
                <td className={`${td} text-[#FFB800]`}>{formatPrice(o.totalCents)}</td>
                <td className={td}>{formatDateTime(o.createdAt)}</td>
              </TableRow>
            ))}
          </AdminTable>
        )}
      </section>
    </div>
  );
}
