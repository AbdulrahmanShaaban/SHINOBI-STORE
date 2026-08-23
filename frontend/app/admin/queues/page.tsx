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
import QueueStat from '@/components/admin/QueueStat';

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

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

  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
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
    setRowError(null);
    setFlash(null);
    setSelectedQueue(name);
    setPage(1);
  };

  const requeue = async (jobId: string) => {
    if (!selectedQueue || busyJobId !== null) return;
    setBusyJobId(jobId);
    setRowError(null);
    setFlash(null);
    try {
      await adminApi.requeueFailedJob(selectedQueue, jobId);
      setFlash(`Job ${jobId} requeued.`);
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
      setRowError(
        err instanceof AdminError && err.status === 404
          ? 'Job no longer exists'
          : err instanceof Error
            ? err.message
            : 'Could not requeue the job.',
      );
    } finally {
      setBusyJobId(null);
    }
  };

  const refreshAll = () => {
    setRowError(null);
    setFlash(null);
    setPage(1);
    setRefreshNonce((n) => n + 1);
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-bebas text-5xl tracking-wide text-[#F0F0F0]">QUEUES</h1>
        <button
          type="button"
          onClick={refreshAll}
          disabled={queues === null}
          className="rounded-lg border border-[#2A2A3A] px-4 py-2 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          REFRESH
        </button>
      </div>

      {queuesError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]"
        >
          {queuesError}
        </p>
      ) : null}

      {queues === null ? (
        <p className="text-[#6B6B80]" role="status" aria-live="polite">
          Loading…
        </p>
      ) : queues.length === 0 ? (
        <p className="text-sm text-[#6B6B80]">No queues configured.</p>
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
              className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]"
            >
              FAILED JOBS{selectedQueue ? ` — ${selectedQueue.toUpperCase()}` : ''}
            </h2>

            {rowError ? (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]"
              >
                {rowError}
              </p>
            ) : null}

            {flash ? (
              <p
                role="status"
                aria-live="polite"
                className="mb-4 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-2 text-sm text-[#F0F0F0]"
              >
                {flash}
              </p>
            ) : null}

            {!selectedQueue ? (
              <p className="text-sm text-[#6B6B80]">Select a queue to inspect its failed jobs.</p>
            ) : current?.error ? (
              <p
                role="alert"
                className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]"
              >
                {current.error}
              </p>
            ) : failedLoading ? (
              <p className="text-[#6B6B80]" role="status" aria-live="polite">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="text-sm text-[#6B6B80]">No failed jobs in this queue.</p>
            ) : (
              <>
                <AdminTable headers={['ID', 'JOB', 'REASON', 'ATTEMPTS', 'FAILED AT', '']}>
                  {items.map((job) => (
                    <TableRow key={job.id}>
                      <td
                        className={`${td} max-w-[140px] truncate font-mono text-xs`}
                        title={job.id}
                      >
                        {job.id}
                      </td>
                      <td
                        className={`${td} font-cinzel text-xs uppercase tracking-wider text-[#F0F0F0]`}
                      >
                        {job.name}
                      </td>
                      <td className={td}>
                        <span
                          title={job.failedReason}
                          className="block max-w-[240px] truncate text-xs"
                        >
                          {job.failedReason}
                        </span>
                      </td>
                      <td className={td}>{job.attemptsMade}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        {formatTimestamp(job.timestamp)}
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <button
                          type="button"
                          disabled={busyJobId !== null}
                          onClick={() => {
                            void requeue(job.id);
                          }}
                          className="rounded-lg border border-[#2A2A3A] px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {busyJobId === job.id ? 'SAVING…' : 'REQUEUE'}
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
      )}
    </div>
  );
}
