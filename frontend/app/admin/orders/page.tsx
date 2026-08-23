'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import DataTableToolbar from '@/components/admin/DataTableToolbar';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminList } from '@/components/admin/use-admin-list';
import { formatDateTime } from '@/components/admin/format';
import { btnGhost, inputClass, tdClass } from '@/components/admin/ui';

const STATUS_OPTIONS = [
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const list = useAdminList(
    () => adminApi.listOrders({ status: status || undefined, q: q || undefined, page }),
    [status, q, page],
  );
  const result = list.data;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(qDraft.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [qDraft]);

  const retry = list.reload;

  const applySearchNow = () => {
    setQ(qDraft.trim());
    setPage(1);
  };

  const filtersActive = status !== '' || q !== '';
  const clearFilters = () => {
    setStatus('');
    setQDraft('');
    setQ('');
    setPage(1);
  };

  const items = result?.items ?? [];
  const totalPages = result?.meta?.totalPages ?? 1;
  const { loading, error } = list;

  return (
    <div>
      <h1 className="sr-only">Orders</h1>

      <DataTableToolbar
        searchValue={qDraft}
        onSearchChange={setQDraft}
        onSearchSubmit={applySearchNow}
        searchPlaceholder="Search by order number or email…"
        searchLabel="Search orders"
        filters={
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={`${inputClass} min-h-[44px] w-full sm:w-48`}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        }
        actions={
          result ? (
            <span className="hidden text-xs uppercase tracking-wider text-[#6B6B80] lg:block">
              {result.meta.total} total
            </span>
          ) : null
        }
      />

      {error && !loading ? <ErrorState message={error} onRetry={retry} /> : null}

      {!error || loading ? (
        loading && !result ? (
          <AdminTable headers={['ORDER', 'STATUS', 'ITEMS', 'TOTAL', 'PLACED', 'CONTACT']} isLoading skeletonRows={8}>
            <></>
          </AdminTable>
        ) : !loading && result && items.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState
              title={filtersActive ? 'NO MATCHING ORDERS' : 'NO ORDERS YET'}
              description={
                filtersActive
                  ? 'No orders match the current search or status filter.'
                  : 'Customer orders will land here as soon as checkout goes live.'
              }
              action={
                filtersActive ? (
                  <button type="button" onClick={clearFilters} className={btnGhost}>
                    CLEAR FILTERS
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : result ? (
          <>
            <AdminTable headers={['ORDER', 'STATUS', 'ITEMS', 'TOTAL', 'PLACED', 'CONTACT']} caption="All customer orders" zebra>
              {items.map((o) => (
                <TableRow key={o.id}>
                  <td className={tdClass}>
                    <Link
                      href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                      className="font-mono text-xs text-[#FF6B00] hover:underline underline-offset-4"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className={tdClass}>{o.itemCount}</td>
                  <td className={`${tdClass} whitespace-nowrap text-[#FFB800]`}>{formatPrice(o.totalCents)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(o.createdAt)}</td>
                  <td className={`${tdClass} max-w-[200px] truncate`}>{o.contactEmail}</td>
                </TableRow>
              ))}
            </AdminTable>
            <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : null
      ) : null}
    </div>
  );
}
