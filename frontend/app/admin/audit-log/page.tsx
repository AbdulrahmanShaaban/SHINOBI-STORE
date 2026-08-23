'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import DataTableToolbar from '@/components/admin/DataTableToolbar';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import { useAdminList } from '@/components/admin/use-admin-list';
import { formatDateTime } from '@/components/admin/format';
import { btnGhost, tdClass } from '@/components/admin/ui';

function diffToText(diff: unknown): string {
  if (diff === null || diff === undefined) return '—';
  if (typeof diff === 'string') return diff;
  try {
    return JSON.stringify(diff) ?? '—';
  } catch {
    return '—';
  }
}

function actionClass(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('ban') || a.includes('remove')) return 'text-[#FF6B6B]';
  if (a.includes('create')) return 'text-[#4ADE80]';
  if (a.includes('update') || a.includes('transition')) return 'text-[#C4B5FD]';
  return 'text-[#F0F0F0]';
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
      <h1 className="sr-only">Audit log</h1>

      <DataTableToolbar
        searchValue={actionFilter}
        onSearchChange={setActionFilter}
        searchPlaceholder="Filter by action…"
        searchLabel="Filter by action"
        actions={
          list.data ? (
            <span className="hidden text-xs uppercase tracking-wider text-[#6B6B80] lg:block">
              {items.length} of {list.data.meta.total}
            </span>
          ) : null
        }
      />

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}

      {!list.error ? (
        list.loading && !list.data ? (
          <AdminTable headers={['TIME', 'ACTION', 'ENTITY', 'ACTOR', 'IP', 'DIFF']} isLoading skeletonRows={8}>
            <></>
          </AdminTable>
        ) : !list.loading && items.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            {actionFilter.trim() !== '' ? (
              <EmptyState
                title="NO MATCHING ENTRIES"
                description={`No audit actions contain “${actionFilter.trim()}”.`}
                action={
                  <button type="button" onClick={() => setActionFilter('')} className={btnGhost}>
                    CLEAR FILTER
                  </button>
                }
              />
            ) : (
              <EmptyState
                title="NO AUDIT ENTRIES"
                description="Staff actions on orders, products and customers are recorded here."
              />
            )}
          </div>
        ) : items.length > 0 ? (
          <>
            <AdminTable headers={['TIME', 'ACTION', 'ENTITY', 'ACTOR', 'IP', 'DIFF']} caption="Audit trail" zebra>
              {items.map((entry) => {
                const diffText = diffToText(entry.diff);
                return (
                  <TableRow key={entry.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(entry.createdAt)}</td>
                    <td
                      className={`${tdClass} whitespace-nowrap font-cinzel text-xs font-bold uppercase tracking-wider ${actionClass(entry.action)}`}
                    >
                      {entry.action.replace(/_/g, ' ')}
                    </td>
                    <td className={tdClass}>
                      {entry.entityType.replace(/_/g, ' ')}
                      <span
                        className="block max-w-[160px] truncate font-mono text-xs text-[#6B6B80]"
                        title={entry.entityId}
                      >
                        {entry.entityId}
                      </span>
                    </td>
                    <td className={`${tdClass} max-w-[140px] truncate font-mono text-xs`} title={entry.actorUserId}>
                      {entry.actorUserId}
                    </td>
                    <td className={`${tdClass} font-mono text-xs`}>{entry.ip ?? '—'}</td>
                    <td className={tdClass}>
                      <pre
                        title={diffText}
                        className="max-w-[240px] truncate whitespace-nowrap rounded-md bg-[#12121A] px-2 py-1 font-mono text-xs text-[#9B9BB0]"
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
        ) : null
      ) : null}
    </div>
  );
}
