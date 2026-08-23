'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type OrderListResult } from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatDateTime } from '@/components/admin/format';

const STATUS_OPTIONS = [
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<OrderListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(qDraft.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [qDraft]);

  useEffect(() => {
    let alive = true;
    adminApi
      .listOrders({ status: status || undefined, q: q || undefined, page })
      .then((res) => {
        if (!alive) return;
        setResult(res);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load orders.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [status, q, page]);

  const applySearchNow = () => {
    setQ(qDraft.trim());
    setPage(1);
  };

  const totalPages = result?.meta?.totalPages ?? 1;

  return (
    <div>
      <h1 className="mb-8 font-bebas text-5xl tracking-wide text-[#F0F0F0]">ORDERS</h1>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#2A2A3A] bg-[#12121A] px-3 py-2.5 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search by order number or email…"
          aria-label="Search orders"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearchNow();
          }}
          className="w-full rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none sm:max-w-sm"
        />
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {error}
        </p>
      ) : null}

      {loading && !result ? (
        <p className="text-[#6B6B80]" role="status" aria-live="polite">
          Loading…
        </p>
      ) : result && result.items.length === 0 ? (
        <p className="text-sm text-[#6B6B80]">No orders match the current filters.</p>
      ) : result ? (
        <>
          <AdminTable headers={['ORDER', 'STATUS', 'ITEMS', 'TOTAL', 'PLACED', 'CONTACT']}>
            {result.items.map((o) => (
              <TableRow key={o.id}>
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
                <td className={td}>{o.itemCount}</td>
                <td className={`${td} text-[#FFB800]`}>{formatPrice(o.totalCents)}</td>
                <td className={td}>{formatDateTime(o.createdAt)}</td>
                <td className={`${td} truncate`}>{o.contactEmail}</td>
              </TableRow>
            ))}
          </AdminTable>
          <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
