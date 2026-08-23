'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import { useAdminList } from '@/components/admin/use-admin-list';
import { formatDateTime } from '@/components/admin/format';

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

function diffToText(diff: unknown): string {
  if (diff === null || diff === undefined) return '—';
  if (typeof diff === 'string') return diff;
  try {
    return JSON.stringify(diff) ?? '—';
  } catch {
    return '—';
  }
}

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const list = useAdminList(() => adminApi.listAuditLog(page), [page]);

  const items = (list.data?.items ?? []).filter((entry) =>
    entry.action.toLowerCase().includes(actionFilter.trim().toLowerCase()),
  );

  return (
    <div>
      <h1 className="mb-8 font-bebas text-5xl tracking-wide text-[#F0F0F0]">AUDIT LOG</h1>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Filter by action…"
          aria-label="Filter by action"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none sm:max-w-sm"
        />
      </div>

      {list.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {list.error}
        </p>
      ) : null}

      {list.loading && !list.data ? (
        <p className="text-[#6B6B80]" role="status" aria-live="polite">
          Loading…
        </p>
      ) : !list.loading && items.length === 0 ? (
        <p className="text-sm text-[#6B6B80]">No audit entries match the current filter.</p>
      ) : items.length > 0 ? (
        <>
          <AdminTable headers={['TIME', 'ACTION', 'ENTITY', 'ACTOR', 'IP', 'DIFF']}>
            {items.map((entry) => {
              const diffText = diffToText(entry.diff);
              return (
                <TableRow key={entry.id}>
                  <td className={`${td} whitespace-nowrap`}>{formatDateTime(entry.createdAt)}</td>
                  <td className={`${td} font-cinzel font-bold uppercase tracking-wider text-[#F0F0F0]`}>
                    {entry.action.replace(/_/g, ' ')}
                  </td>
                  <td className={td}>
                    {entry.entityType.replace(/_/g, ' ')}
                    <span className="block max-w-[160px] truncate font-mono text-xs text-[#6B6B80]" title={entry.entityId}>
                      {entry.entityId}
                    </span>
                  </td>
                  <td className={`${td} max-w-[140px] truncate font-mono text-xs`} title={entry.actorUserId}>
                    {entry.actorUserId}
                  </td>
                  <td className={`${td} font-mono text-xs`}>{entry.ip ?? '—'}</td>
                  <td className={td}>
                    <pre
                      title={diffText}
                      className="max-w-[240px] truncate whitespace-nowrap font-mono text-xs text-[#6B6B80]"
                    >
                      {diffText}
                    </pre>
                  </td>
                </TableRow>
              );
            })}
          </AdminTable>
          <AdminPagination
            page={page}
            totalPages={list.data?.meta?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}
