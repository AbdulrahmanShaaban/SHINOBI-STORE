'use client';

import { useState } from 'react';
import { adminApi, type AdminReview } from '@/lib/admin-api';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import DataTableToolbar from '@/components/admin/DataTableToolbar';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminList } from '@/components/admin/use-admin-list';
import { formatDateTime } from '@/components/admin/format';
import { pushToast } from '@/components/shared/Toast';
import { btnPrimary, btnRow, tdClass } from '@/components/admin/ui';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-[#FFB800]">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'opacity-100' : 'opacity-30'}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [page, setPage] = useState(1);

  const statusParam = filter === 'all' ? undefined : filter;
  const list = useAdminList(() => adminApi.listReviews({ status: statusParam, page }), [statusParam, page]);

  const [pendingAction, setPendingAction] = useState<{
    type: 'approve' | 'delete';
    review: AdminReview;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const items = list.data?.items ?? [];

  const handleApprove = async (review: AdminReview) => {
    setActionBusy(true);
    try {
      await adminApi.moderateReview(review.id, { status: 'approved' });
      pushToast({ title: 'REVIEW APPROVED', description: `Review by ${review.user?.fullName ?? 'Unknown'} approved.`, variant: 'success' });
      list.reload();
    } catch (err: unknown) {
      pushToast({ title: 'ERROR', description: err instanceof Error ? err.message : 'Failed to approve review.', variant: 'error' });
    } finally {
      setActionBusy(false);
      setPendingAction(null);
    }
  };

  const handleDelete = async (review: AdminReview) => {
    setActionBusy(true);
    try {
      await adminApi.deleteReview(review.id);
      pushToast({ title: 'REVIEW DELETED', description: `Review by ${review.user?.fullName ?? 'Unknown'} deleted.`, variant: 'success' });
      list.reload();
    } catch (err: unknown) {
      pushToast({ title: 'ERROR', description: err instanceof Error ? err.message : 'Failed to delete review.', variant: 'error' });
    } finally {
      setActionBusy(false);
      setPendingAction(null);
    }
  };

  return (
    <div>
      <h1 className="sr-only">Reviews</h1>

      <DataTableToolbar
        filters={
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setFilter(tab); setPage(1); }}
                className={`rounded-lg border px-3 py-1.5 font-cinzel text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  filter === tab
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-[#2A2A3A] bg-[#16161F] text-[#6B6B80] hover:border-[#3A3A4A] hover:text-[#B8B8CC]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        }
        actions={
          list.data ? (
            <span className="hidden text-xs uppercase tracking-wider text-[#6B6B80] lg:block">
              {list.data.meta.total} total
            </span>
          ) : null
        }
      />

      {list.error && !list.loading ? <ErrorState message={list.error} onRetry={list.reload} /> : null}

      {list.loading && !list.data ? (
        <AdminTable
          headers={['RATING', 'REVIEW', 'AUTHOR', 'PRODUCT', 'DATE', 'STATUS', '']}
          isLoading
          skeletonRows={6}
        >
          <></>
        </AdminTable>
      ) : list.data && items.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
          <EmptyState
            title={filter === 'all' ? 'NO REVIEWS YET' : `NO ${filter.toUpperCase()} REVIEWS`}
            description={
              filter === 'all'
                ? 'Customer reviews will appear here once submitted.'
                : `There are no ${filter} reviews at the moment.`
            }
          />
        </div>
      ) : list.data ? (
        <>
          <AdminTable headers={['RATING', 'REVIEW', 'AUTHOR', 'PRODUCT', 'DATE', 'STATUS', '']} caption="Customer reviews">
            {items.map((r) => (
              <TableRow key={r.id}>
                <td className={tdClass}>
                  <StarRating rating={r.rating} />
                </td>
                <td className={`${tdClass} max-w-[300px]`}>
                  {r.title ? <span className="font-medium text-[#F0F0F0]">{r.title}</span> : null}
                  <p className="mt-0.5 line-clamp-2 text-sm text-[#B8B8CC]">{r.body}</p>
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  <span className="text-[#F0F0F0]">{r.user?.fullName ?? 'Unknown'}</span>
                </td>
                <td className={`${tdClass} max-w-[200px] truncate`}>{r.product?.name ?? '—'}</td>
                <td className={`${tdClass} whitespace-nowrap text-xs`}>{formatDateTime(r.createdAt)}</td>
                <td className={tdClass}>
                  <StatusBadge status={r.status} />
                </td>
                <td className={`${tdClass} text-right`}>
                  <div className="flex items-center justify-end gap-2">
                    {r.status === 'pending' ? (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => setPendingAction({ type: 'approve', review: r })}
                        className={btnPrimary}
                      >
                        APPROVE
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => setPendingAction({ type: 'delete', review: r })}
                      className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[#CC0000]/40 bg-[#CC0000]/10 px-3 font-cinzel text-[11px] font-bold uppercase tracking-wider text-[#FF6B6B] transition-colors hover:bg-[#CC0000]/20 disabled:opacity-50"
                    >
                      DELETE
                    </button>
                  </div>
                </td>
              </TableRow>
            ))}
          </AdminTable>
          <AdminPagination
            page={page}
            totalPages={list.data.meta?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction
            ? pendingAction.type === 'approve'
              ? 'APPROVE THIS REVIEW?'
              : 'DELETE THIS REVIEW?'
            : ''
        }
        description={
          pendingAction
            ? pendingAction.type === 'approve'
              ? 'This review will become visible on the product page.'
              : 'This review will be permanently removed.'
            : ''
        }
        tone={pendingAction?.type === 'delete' ? 'danger' : 'primary'}
        confirmLabel={pendingAction?.type === 'approve' ? 'APPROVE' : 'DELETE'}
        busyLabel="SAVING…"
        busy={actionBusy}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction.type === 'approve') {
            void handleApprove(pendingAction.review);
          } else {
            void handleDelete(pendingAction.review);
          }
        }}
      />
    </div>
  );
}