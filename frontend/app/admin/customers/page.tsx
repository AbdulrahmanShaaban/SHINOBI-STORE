'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import DataTableToolbar from '@/components/admin/DataTableToolbar';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminList } from '@/components/admin/use-admin-list';
import { formatDateTime } from '@/components/admin/format';
import { btnRow, tdClass } from '@/components/admin/ui';

export default function AdminCustomersPage() {
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const list = useAdminList(() => adminApi.listCustomers({ q: q || undefined, page }), [q, page]);
  const result = list.data;
  const { loading, error } = list;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(qDraft.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [qDraft]);

  const items = result?.items ?? [];
  const totalPages = result?.meta?.totalPages ?? 1;
  const filtersActive = q !== '';

  return (
    <div>
      <h1 className="sr-only">Customers</h1>

      <DataTableToolbar
        searchValue={qDraft}
        onSearchChange={setQDraft}
        onSearchSubmit={() => {
          setQ(qDraft.trim());
          setPage(1);
        }}
        searchPlaceholder="Search by email or name…"
        searchLabel="Search customers"
        actions={
          result ? (
            <span className="hidden text-xs uppercase tracking-wider text-[#6B6B80] lg:block">
              {result.meta.total} total
            </span>
          ) : null
        }
      />

      {error && !loading ? (
        <ErrorState message={error} onRetry={list.reload} />
      ) : null}

      {!error || loading ? (
        loading && !result ? (
          <AdminTable headers={['EMAIL', 'NAME', 'ORDERS', 'STATUS', 'JOINED', '']} isLoading skeletonRows={8}>
            <></>
          </AdminTable>
        ) : !loading && result && items.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState
              title={filtersActive ? 'NO MATCHING CUSTOMERS' : 'NO CUSTOMERS YET'}
              description={
                filtersActive
                  ? `Nobody matches “${q}”. Try another email or name.`
                  : 'Customer accounts appear here after the first registration.'
              }
            />
          </div>
        ) : result ? (
          <>
            <AdminTable headers={['EMAIL', 'NAME', 'ORDERS', 'STATUS', 'JOINED', '']} caption="Registered customers" zebra>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <td className={`${tdClass} font-medium text-[#F0F0F0]`}>
                    <Link
                      href={`/admin/customers/${encodeURIComponent(c.id)}`}
                      className="transition-colors hover:text-[#FF6B00]"
                    >
                      {c.email}
                    </Link>
                  </td>
                  <td className={`${tdClass} max-w-[200px] truncate`}>{c.fullName}</td>
                  <td className={tdClass}>{c.orderCount}</td>
                  <td className={tdClass}>
                    <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(c.createdAt)}</td>
                  <td className={`${tdClass} text-right`}>
                    <Link href={`/admin/customers/${encodeURIComponent(c.id)}`} className={btnRow}>
                      VIEW
                    </Link>
                  </td>
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
