'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type CustomerListResult } from '@/lib/admin-api';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatDateTime } from '@/components/admin/format';

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

export default function AdminCustomersPage() {
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CustomerListResult | null>(null);
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
      .listCustomers({ q: q || undefined, page })
      .then((res) => {
        if (!alive) return;
        setResult(res);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load customers.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [q, page]);

  const totalPages = result?.meta?.totalPages ?? 1;

  return (
    <div>
      <h1 className="mb-8 font-bebas text-5xl tracking-wide text-[#F0F0F0]">CUSTOMERS</h1>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by email or name…"
          aria-label="Search customers"
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

      {loading && !result ? (
        <p className="text-[#6B6B80]" role="status" aria-live="polite">
          Loading…
        </p>
      ) : result && result.items.length === 0 ? (
        <p className="text-sm text-[#6B6B80]">No customers match the current search.</p>
      ) : result ? (
        <>
          <AdminTable headers={['EMAIL', 'NAME', 'ORDERS', 'STATUS', 'JOINED', '']}>
            {result.items.map((c) => (
              <TableRow key={c.id}>
                <td className={`${td} text-[#F0F0F0]`}>
                  <Link
                    href={`/admin/customers/${encodeURIComponent(c.id)}`}
                    className="hover:text-[#FF6B00]"
                  >
                    {c.email}
                  </Link>
                </td>
                <td className={`${td} truncate`}>{c.fullName}</td>
                <td className={td}>{c.orderCount}</td>
                <td className={td}>
                  <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
                </td>
                <td className={td}>{formatDateTime(c.createdAt)}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <Link
                    href={`/admin/customers/${encodeURIComponent(c.id)}`}
                    className="rounded-lg border border-[#2A2A3A] px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0]"
                  >
                    VIEW
                  </Link>
                </td>
              </TableRow>
            ))}
          </AdminTable>
          <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
