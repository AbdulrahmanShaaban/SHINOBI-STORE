'use client';

import { useEffect, useRef, useState } from 'react';
import {
  adminApi,
  AdminError,
  type FailedJobsResult,
  type QueueInfo,
} from '@/lib/admin-api';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import DataTableToolbar from '@/components/admin/DataTableToolbar';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import QueueStat from '@/components/admin/QueueStat';
import { btnGhost, tdClass } from '@/components/admin/ui';

interface FailedSnapshot {
  queue: string;
  page: number;
  result: FailedJobsResult | null;
  error: string | null;
}

function isIdle(queues: QueueInfo[]): boolean {
  return queues.every((q) => Object.values(q.counts).every((count) => count === 0));
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? String(timestamp) : date.toLocaleString();
}

export default function AdminQueuesPage() {
  const [queues, setQueues] = useState<QueueInfo[] | null>(null);
  const [queuesError, setQueuesError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const queuesSeq = useRef(0);

  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [snapshot, setSnapshot] = useState<FailedSnapshot | null>(null);
  const failedSeq = useRef(0);

  const [pendingJob, setPendingJob] = useState<{ id: string; name: string; reason: string } | null>(
    null,
  );
  const [requeueSaving, setRequeueSaving] = useState(false);
  const [requeueError, setRequeueError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const ticket = ++queuesSeq.current;
    adminApi
      .listQueues()
      .then((result) => {
        if (queuesSeq.current !== ticket) return;
        setQueues(result);
        setQueuesError(null);
        setSelectedQueue((current) =>
          current && result.some((q) => q.name === current)
            ? current
            : (result[0]?.name ?? null),
        );
      })
      .catch((err: unknown) => {
        if (queuesSeq.current !== ticket) return;
        setQueuesError(
          err instanceof AdminError ? err.message : 'Could not load the queue overview.',
        );
        setQueues([]);
      });
  }, [refreshNonce]);

  useEffect(() => {
    if (!selectedQueue) return;
    const ticket = ++failedSeq.current;
    adminApi
      .listFailedJobs(selectedQueue, page)
      .then((result) => {
        if (failedSeq.current !== ticket) return;
        setSnapshot({ queue: selectedQueue, page, result, error: null });
      })
      .catch((err: unknown) => {
        if (failedSeq.current !== ticket) return;
        setSnapshot({
          queue: selectedQueue,
          page,
          result: null,
          error:
            err instanceof AdminError ? err.message : 'Could not load the failed jobs.',
        });
      });
  }, [selectedQueue, page, refreshNonce]);

  const current =
    snapshot &&
    snapshot.queue === selectedQueue &&
    snapshot.page === page
      ? snapshot
      : null;
  const items = current?.result?.items ?? [];
  const failedLoading = selectedQueue !== null && current === null;

  const selectQueue = (name: string) => {
    if (name === selectedQueue) return;
    setFlash(null);
    setSelectedQueue(name);
    setPage(1);
  };

  const requeue = async () => {
    if (!selectedQueue || !pendingJob || requeueSaving) return;
    setRequeueSaving(true);
    setRequeueError(null);
    const jobId = pendingJob.id;
    try {
      await adminApi.requeueFailedJob(selectedQueue, jobId);
      setFlash(`Job ${jobId} requeued.`);
      setPendingJob(null);
      const ticket = ++failedSeq.current;
      try {
        const result = await adminApi.listFailedJobs(selectedQueue, page);
        if (failedSeq.current === ticket) {
          setSnapshot({ queue: selectedQueue, page, result, error: null });
          if (result.items.length === 0 && page > 1 && page > result.meta.totalPages) {
            setPage(Math.max(1, result.meta.totalPages));
          }
        }
      } catch {
        if (failedSeq.current === ticket) {
          setSnapshot({ queue: selectedQueue, page, result: null, error: 'Could not refresh the failed jobs.' });
        }
      }
    } catch (err: unknown) {
      setRequeueError(
        err instanceof AdminError && err.status === 404
          ? 'Job no longer exists'
          : err instanceof Error
            ? err.message
            : 'Could not requeue the job.',
      );
    } finally {
      setRequeueSaving(false);
    }
  };

  const refreshAll = () => {
    setFlash(null);
    setPage(1);
    setRefreshNonce((n) => n + 1);
  };

  return (
    <div>
      <h1 className="sr-only">Queues</h1>

      <DataTableToolbar
        actions={
          <button type="button" onClick={refreshAll} disabled={queues === null} className={btnGhost}>
            REFRESH
          </button>
        }
      />

      {queuesError ? <ErrorState message={queuesError} onRetry={refreshAll} /> : null}

      {!queuesError ? (
        queues === null ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-live="polite">
            <span className="sr-only">Loading queues…</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-[#16161F]" />
            ))}
          </div>
        ) : queues.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState title="NO QUEUES CONFIGURED" description="Background job queues will appear here." />
          </div>
        ) : (
          <>
            {isIdle(queues) ? (
              <p className="mb-4 text-sm text-[#6B6B80]" role="note">
                Queues idle (Redis unavailable)
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {queues.map((queue) => (
                <QueueStat
                  key={queue.name}
                  queue={queue}
                  selected={queue.name === selectedQueue}
                  onSelect={() => selectQueue(queue.name)}
                />
              ))}
            </div>

            <section aria-labelledby="failed-jobs-heading" className="mt-10">
              <h2
                id="failed-jobs-heading"
                className="mb-3 font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]"
              >
                FAILED JOBS{selectedQueue ? ` — ${selectedQueue.toUpperCase()}` : ''}
              </h2>

              {flash ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="mb-4 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
                >
                  {flash}
                </p>
              ) : null}

              {!selectedQueue ? (
                <p className="text-sm text-[#6B6B80]">Select a queue to inspect its failed jobs.</p>
              ) : current?.error ? (
                <ErrorState message={current.error} onRetry={refreshAll} />
              ) : failedLoading ? (
                <AdminTable headers={['ID', 'JOB', 'REASON', 'ATTEMPTS', 'FAILED AT', '']} isLoading skeletonRows={5}>
                  <></>
                </AdminTable>
              ) : items.length === 0 ? (
                <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
                  <EmptyState
                    title="NO FAILED JOBS"
                    description={`Nothing has failed in ${selectedQueue}.`}
                  />
                </div>
              ) : (
                <>
                  <AdminTable headers={['ID', 'JOB', 'REASON', 'ATTEMPTS', 'FAILED AT', '']} caption={`Failed jobs in ${selectedQueue}`}>
                    {items.map((job) => (
                      <TableRow key={job.id}>
                        <td
                          className={`${tdClass} max-w-[140px] truncate font-mono text-xs`}
                          title={job.id}
                        >
                          {job.id}
                        </td>
                        <td
                          className={`${tdClass} font-cinzel text-xs uppercase tracking-wider text-[#F0F0F0]`}
                        >
                          {job.name}
                        </td>
                        <td className={tdClass}>
                          <span
                            title={job.failedReason}
                            className="block max-w-[240px] truncate text-xs"
                          >
                            {job.failedReason}
                          </span>
                        </td>
                        <td className={tdClass}>{job.attemptsMade}</td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          {formatTimestamp(job.timestamp)}
                        </td>
                        <td className={`${tdClass} text-right`}>
                          <button
                            type="button"
                            disabled={requeueSaving}
                            onClick={() => {
                              setPendingJob({
                                id: job.id,
                                name: job.name,
                                reason: job.failedReason,
                              });
                              setRequeueError(null);
                            }}
                            className="relative inline-flex min-h-[36px] items-center justify-center whitespace-nowrap rounded-lg border border-[#2A2A3A] px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B00] hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            REQUEUE
                          </button>
                        </td>
                      </TableRow>
                    ))}
                  </AdminTable>
                  <AdminPagination
                    page={page}
                    totalPages={current?.result?.meta?.totalPages ?? 1}
                    onPageChange={setPage}
                  />
                </>
              )}
            </section>
          </>
        )
      ) : null}

      <ConfirmDialog
        open={pendingJob !== null}
        title="REQUEUE FAILED JOB?"
        description={
          pendingJob ? (
            <>
              Job <span className="font-mono text-xs text-[#F0F0F0]">{pendingJob.id}</span> (
              {pendingJob.name}) will run again.
              <span className="mt-2 block break-words font-mono text-xs text-[#6B6B80]">
                {pendingJob.reason.slice(0, 200)}
              </span>
            </>
          ) : undefined
        }
        tone="primary"
        confirmLabel="REQUEUE"
        busyLabel="REQUEUEING…"
        busy={requeueSaving}
        onClose={() => {
          setPendingJob(null);
          setRequeueError(null);
        }}
        onConfirm={() => void requeue()}
      >
        {requeueError ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
            {requeueError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
