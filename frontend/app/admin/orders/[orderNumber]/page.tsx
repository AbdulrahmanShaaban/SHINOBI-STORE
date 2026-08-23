'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  adminApi,
  type OrderDetail,
  type OrderTransitionTarget,
} from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import EventTimeline from '@/components/admin/EventTimeline';
import SectionCard from '@/components/admin/SectionCard';
import { SkeletonText } from '@/components/admin/Skeleton';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatDateTime } from '@/components/admin/format';
import { helpClass, inputClass, labelClass, tdClass } from '@/components/admin/ui';

const ALLOWED_TRANSITIONS: Record<string, OrderTransitionTarget[]> = {
  confirmed: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  pending_payment: ['cancelled'],
};

const TRANSITION_LABEL: Record<OrderTransitionTarget, string> = {
  processing: 'MARK PROCESSING',
  shipped: 'MARK SHIPPED',
  delivered: 'MARK DELIVERED',
  cancelled: 'CANCEL ORDER',
};

const TRANSITION_DESCRIPTION: Record<OrderTransitionTarget, string> = {
  processing: 'The order is being prepared. The customer sees this status in their account.',
  shipped: 'Confirm the parcel has left the warehouse.',
  delivered: 'Confirm the customer has received the order.',
  cancelled:
    'Cancelling is permanent for this order. Add a note explaining why for the audit trail.',
};

function timelineTone(type: string): 'danger' | 'success' | 'neutral' | undefined {
  const t = type.toLowerCase();
  if (t.includes('cancel') || t.includes('fail') || t.includes('refund')) return 'danger';
  if (t.includes('deliver') || t.includes('complete')) return 'success';
  return undefined;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber;

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    adminApi
      .getOrder(orderNumber)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load the order.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orderNumber, retryNonce]);

  const retry = () => setRetryNonce((n) => n + 1);

  const [target, setTarget] = useState<OrderTransitionTarget | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const applyTransition = async () => {
    if (!target || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await adminApi.transitionOrder(orderNumber, {
        to: target,
        note: note.trim() || undefined,
      });
      setTarget(null);
      setNote('');
      setFlash(true);
      adminApi
        .getOrder(orderNumber)
        .then(setDetail)
        .catch(() => undefined);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not update the order.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <span className="sr-only">Loading order…</span>
        <SkeletonText lines={1} className="max-w-xs" />
        <div className="h-24 animate-pulse rounded-xl bg-[#16161F]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl bg-[#16161F]" />
          <div className="h-40 animate-pulse rounded-xl bg-[#16161F]" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-[#16161F]" />
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div>
        <Link
          href="/admin/orders"
          className="mb-5 inline-flex min-h-[44px] items-center gap-2 font-cinzel text-sm font-bold text-[#FF6B00] hover:underline underline-offset-4"
        >
          ← BACK TO ORDERS
        </Link>
        <ErrorState
          message={loadError ?? 'Order not found.'}
          onRetry={loadError ? retry : undefined}
        />
      </div>
    );
  }

  const allowed = ALLOWED_TRANSITIONS[detail.status] ?? [];
  const events = [...detail.events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-5 inline-flex min-h-[44px] items-center gap-2 font-cinzel text-sm font-bold text-[#FF6B00] hover:underline underline-offset-4"
      >
        ← BACK TO ORDERS
      </Link>

      <header className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-[#2A2A3A] bg-[#16161F] px-5 py-4">
        <h1 className="font-bebas text-4xl tracking-wide text-[#F0F0F0]">{detail.orderNumber}</h1>
        <StatusBadge status={detail.status} />
        <span className="ml-auto font-bebas text-3xl tracking-wide text-[#FFB800]">
          {formatPrice(detail.totalCents)}
        </span>
      </header>

      <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border border-[#2A2A3A] bg-[#12121A] p-5 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
        <dt className="text-[#6B6B80]">Placed</dt>
        <dd>{formatDateTime(detail.createdAt)}</dd>
        <dt className="text-[#6B6B80]">Contact</dt>
        <dd className="break-all">{detail.contactEmail}</dd>
      </dl>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <SectionCard title="SHIPPING ADDRESS">
          <div className="text-sm leading-relaxed text-[#B8B8CC]">
            <p className="text-[#F0F0F0]">{detail.shippingAddress?.fullName}</p>
            <p>{detail.shippingAddress?.line1}</p>
            <p>
              {detail.shippingAddress?.city} {detail.shippingAddress?.postalCode}
            </p>
            <p>{detail.shippingAddress?.country}</p>
          </div>
        </SectionCard>

        <SectionCard title="UPDATE STATUS" tone={allowed.length === 0 ? undefined : 'raised'}>
          {allowed.length === 0 ? (
            <p className="text-sm text-[#6B6B80]">
              No further transitions are available for this status.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {allowed.map((to) => (
                  <button
                    key={to}
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setTarget(to);
                      setSaveError(null);
                    }}
                    className={
                      to === 'cancelled'
                        ? 'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#CC0000]/60 px-5 font-cinzel text-xs font-bold uppercase tracking-wider text-[#FF6B6B] transition-colors hover:bg-[#CC0000]/10 disabled:cursor-not-allowed disabled:opacity-50'
                        : 'inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#FF6B00] px-5 font-cinzel text-xs font-bold uppercase tracking-wider text-[#160B02] transition-colors hover:bg-[#FF8433] disabled:cursor-not-allowed disabled:opacity-50'
                    }
                  >
                    {TRANSITION_LABEL[to]}
                  </button>
                ))}
              </div>
              <p className={`${helpClass} mt-3`}>
                Every change requires confirmation and is recorded in the audit trail.
              </p>
            </>
          )}
          {flash ? (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
            >
              Status updated.
            </p>
          ) : null}
        </SectionCard>
      </div>

      {detail.payments.length > 0 ? (
        <section aria-labelledby="payments-heading" className="mb-8">
          <h2 className="mb-3 font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]">
            PAYMENTS
          </h2>
          <div className="flex flex-wrap gap-2">
            {detail.payments.map((p, index) => (
              <StatusBadge key={index} status={p.status} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="items-heading" className="mb-8">
        <h2 className="mb-3 font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]">
          ITEMS
        </h2>
        <AdminTable headers={['PRODUCT', 'VARIANT', 'SKU', 'QTY', 'TOTAL']} caption="Items in this order">
          {detail.items.map((item, index) => (
            <TableRow key={`${item.sku}-${index}`}>
              <td className={`${tdClass} text-[#F0F0F0]`}>{item.productName}</td>
              <td className={tdClass}>{item.variantName ?? '—'}</td>
              <td className={`${tdClass} font-mono text-xs`}>{item.sku}</td>
              <td className={tdClass}>{item.quantity}</td>
              <td className={`${tdClass} whitespace-nowrap text-[#FFB800]`}>
                {formatPrice(item.totalCents)}
              </td>
            </TableRow>
          ))}
        </AdminTable>
      </section>

      <section aria-labelledby="timeline-heading">
        <h2 className="mb-4 font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]">
          TIMELINE
        </h2>
        {events.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState title="NO EVENTS YET" description="Status changes and notes will appear here." />
          </div>
        ) : (
          <EventTimeline
            items={events.map((event, index) => ({
              id: `${event.createdAt}-${index}`,
              title: event.type.replace(/_/g, ' '),
              subtitle:
                event.fromStatus && event.toStatus ? (
                  <span className="text-xs normal-case tracking-normal text-[#9B9BB0]">
                    {event.fromStatus.replace(/_/g, ' ')} → {event.toStatus.replace(/_/g, ' ')}
                  </span>
                ) : undefined,
              body: event.message,
              meta: `${formatDateTime(event.createdAt)} · by ${event.actorType.replace(/_/g, ' ')}`,
              tone: index === events.length - 1 ? 'accent' : timelineTone(event.type),
              href: undefined,
            }))}
          />
        )}
      </section>

      <ConfirmDialog
        open={target !== null}
        title={target ? `MARK AS ${target.replace(/_/g, ' ').toUpperCase()}` : ''}
        description={target ? TRANSITION_DESCRIPTION[target] : undefined}
        tone={target === 'cancelled' ? 'danger' : 'primary'}
        confirmLabel={target === 'cancelled' ? 'CANCEL ORDER' : 'CONFIRM'}
        busyLabel="SAVING…"
        busy={saving}
        onClose={() => {
          setTarget(null);
          setSaveError(null);
        }}
        onConfirm={() => void applyTransition()}
      >
        <div>
          <label htmlFor="transition-note" className={labelClass}>
            NOTE (OPTIONAL)
          </label>
          <textarea
            id="transition-note"
            data-autofocus
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note for the audit trail"
            className={`${inputClass} resize-y`}
          />
        </div>
        {saveError ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
            {saveError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
