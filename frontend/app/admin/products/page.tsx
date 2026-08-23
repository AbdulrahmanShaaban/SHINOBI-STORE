'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type AdminProductRow, type PageMeta } from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import StatusBadge from '@/components/admin/StatusBadge';

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

export default function AdminProductsPage() {
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ items: AdminProductRow[]; meta?: PageMeta } | null>(null);
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
      .listProducts({ q: q || undefined, page })
      .then((res) => {
        if (!alive) return;
        setResult(res);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load products.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [q, page]);

  const items = result?.items ?? [];
  const totalPages = result?.meta?.totalPages ?? 1;

  return (
    <div>
      <h1 className="font-bebas text-5xl tracking-wide text-[#F0F0F0]">PRODUCTS</h1>
      <p className="mb-6 mt-2 text-sm text-[#6B6B80]">Variants editor ships next.</p>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by name or slug…"
          aria-label="Search products"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setQ(qDraft.trim());
              setPage(1);
            }
          }}
          className="w-full rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none sm:max-w-sm"
        />
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {error}
        </p>
      ) : null}

      {loading && result === null ? (
        <p className="text-[#6B6B80]" role="status" aria-live="polite">
          Loading…
        </p>
      ) : !loading && items.length === 0 ? (
        <p className="text-sm text-[#6B6B80]">No products match the current search.</p>
      ) : items.length > 0 ? (
        <>
          <AdminTable headers={['NAME', 'SLUG', 'PRICE FROM', 'STATUS', '']}>
            {items.map((p) =>
              typeof p.id === 'string' ? (
                <TableRow key={p.id}>
                  <td className={`${td} text-[#F0F0F0]`}>
                    <Link
                      href={`/admin/products/${encodeURIComponent(p.id)}`}
                      className="hover:text-[#FF6B00]"
                    >
                      {typeof p.name === 'string' && p.name !== '' ? p.name : '(unnamed product)'}
                    </Link>
                  </td>
                  <td className={`${td} font-mono text-xs`}>
                    {typeof p.slug === 'string' ? p.slug : '—'}
                  </td>
                  <td className={`${td} text-[#FFB800]`}>{formatPrice(p.priceFromCents)}</td>
                  <td className={td}>
                    {typeof p.status === 'string' ? <StatusBadge status={p.status} /> : '—'}
                  </td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <Link
                      href={`/admin/products/${encodeURIComponent(p.id)}`}
                      className="rounded-lg border border-[#2A2A3A] px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0]"
                    >
                      EDIT
                    </Link>
                  </td>
                </TableRow>
              ) : null,
            )}
          </AdminTable>
          <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
