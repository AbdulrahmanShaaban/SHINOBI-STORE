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
import { btnRow, tdClass } from '@/components/admin/ui';

export default function AdminProductsPage() {
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const list = useAdminList(() => adminApi.listProducts({ q: q || undefined, page }), [q, page]);
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
      <h1 className="sr-only">Products</h1>
      <p className="-mt-1 mb-5 text-sm text-[#6B6B80]">Variants editor ships next.</p>

      <DataTableToolbar
        searchValue={qDraft}
        onSearchChange={setQDraft}
        onSearchSubmit={() => {
          setQ(qDraft.trim());
          setPage(1);
        }}
        searchPlaceholder="Search by name or slug…"
        searchLabel="Search products"
        actions={
          result && result.meta ? (
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
        loading && result === null ? (
          <AdminTable headers={['NAME', 'SLUG', 'PRICE FROM', 'STATUS', '']} isLoading skeletonRows={8}>
            <></>
          </AdminTable>
        ) : !loading && items.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState
              title={filtersActive ? 'NO MATCHING PRODUCTS' : 'NO PRODUCTS YET'}
              description={
                filtersActive
                  ? `Nothing matches “${q}”. Try a different name or slug.`
                  : 'Products created in the catalog will appear here.'
              }
            />
          </div>
        ) : items.length > 0 ? (
          <>
            <AdminTable headers={['NAME', 'SLUG', 'PRICE FROM', 'STATUS', '']} caption="Catalog products" zebra>
              {items.map((p) =>
                typeof p.id === 'string' ? (
                  <TableRow key={p.id}>
                    <td className={`${tdClass} font-medium text-[#F0F0F0]`}>
                      <Link
                        href={`/admin/products/${encodeURIComponent(p.id)}`}
                        className="transition-colors hover:text-[#FF6B00]"
                      >
                        {typeof p.name === 'string' && p.name !== '' ? p.name : '(unnamed product)'}
                      </Link>
                    </td>
                    <td className={`${tdClass} font-mono text-xs`}>
                      {typeof p.slug === 'string' ? p.slug : '—'}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-[#FFB800]`}>
                      {formatPrice(p.priceFromCents)}
                    </td>
                    <td className={tdClass}>
                      {typeof p.status === 'string' ? <StatusBadge status={p.status} /> : '—'}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Link href={`/admin/products/${encodeURIComponent(p.id)}`} className={btnRow}>
                        EDIT
                      </Link>
                    </td>
                  </TableRow>
                ) : null,
              )}
            </AdminTable>
            <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : null
      ) : null}
    </div>
  );
}
