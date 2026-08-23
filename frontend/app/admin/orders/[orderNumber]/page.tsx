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
import StatusBadge from '@/components/admin/StatusBadge';
import { formatDateTime } from '@/components/admin/format';

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

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber;

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<OrderTransitionTarget | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    adminApi
      .getOrder(orderNumber)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
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
  }, [orderNumber]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const refresh = () => {
    adminApi
      .getOrder(orderNumber)
      .then(setDetail)
      .catch(() => undefined);
  };

  const applyTransition = async () => {
    if (!target) return;
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
      refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not update the order.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-[#6B6B80]" role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (loadError || !detail) {
    return (
      <div>
        <Link href="/admin/orders" className="text-sm text-[#FF6B00] hover:underline underline-offset-4">
          ← Back to orders
        </Link>
        <p role="alert" className="mt-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {loadError ?? 'Order not found.'}
        </p>
      </div>
    );
  }

  const allowed = ALLOWED_TRANSITIONS[detail.status] ?? [];
  const events = [...detail.events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-[#FF6B00] hover:underline underline-offset-4">
        ← Back to orders
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <h1 className="font-bebas text-4xl tracking-wide text-[#F0F0F0] sm:text-5xl">
          {detail.orderNumber}
        </h1>
        <StatusBadge status={detail.status} />
        <span className="ml-auto font-bebas text-2xl text-[#FFB800]">
          {formatPrice(detail.totalCents)}
        </span>
      </header>

      <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
        <dt className="text-[#6B6B80]">Placed</dt>
        <dd>{formatDateTime(detail.createdAt)}</dd>
        <dt className="text-[#6B6B80]">Contact</dt>
        <dd className="break-all">{detail.contactEmail}</dd>
      </dl>

      <section aria-labelledby="shipping-heading" className="mb-8">
        <h2 id="shipping-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          SHIPPING ADDRESS
        </h2>
        <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 text-sm text-[#B8B8CC]">
          <p className="text-[#F0F0F0]">{detail.shippingAddress?.fullName}</p>
          <p>{detail.shippingAddress?.line1}</p>
          <p>
            {detail.shippingAddress?.city} {detail.shippingAddress?.postalCode}
          </p>
          <p>{detail.shippingAddress?.country}</p>
        </div>
      </section>

      <section aria-labelledby="items-heading" className="mb-8">
        <h2 id="items-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          ITEMS
        </h2>
        <AdminTable headers={['PRODUCT', 'VARIANT', 'SKU', 'QTY', 'TOTAL']}>
          {detail.items.map((item, index) => (
            <TableRow key={`${item.sku}-${index}`}>
              <td className={`${td} text-[#F0F0F0]`}>{item.productName}</td>
              <td className={td}>{item.variantName ?? '—'}</td>
              <td className={`${td} font-mono text-xs`}>{item.sku}</td>
              <td className={td}>{item.quantity}</td>
              <td className={`${td} text-[#FFB800]`}>{formatPrice(item.totalCents)}</td>
            </TableRow>
          ))}
        </AdminTable>
      </section>

      {detail.payments.length > 0 ? (
        <section aria-labelledby="payments-heading" className="mb-8">
          <h2 id="payments-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
            PAYMENTS
          </h2>
          <div className="flex flex-wrap gap-2">
            {detail.payments.map((p, index) => (
              <StatusBadge key={index} status={p.status} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="transition-heading" className="mb-8">
        <h2 id="transition-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          UPDATE STATUS
        </h2>
        {allowed.length === 0 ? (
          <p className="text-sm text-[#6B6B80]">
            No further transitions are available for this status.
          </p>
        ) : (
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
                className={`rounded-lg px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  to === 'cancelled'
                    ? 'border border-[#CC0000]/60 bg-transparent text-[#F0F0F0] hover:border-[#CC0000]'
                    : 'bg-[#CC0000] text-white hover:bg-[#FF6B00]'
                }`}
              >
                {TRANSITION_LABEL[to]}
              </button>
            ))}
          </div>
        )}

        {target ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void applyTransition();
            }}
            className="mt-4 max-w-xl space-y-3 rounded-xl border border-[#2A2A3A] bg-[#12121A] p-4"
          >
            <p className="text-sm text-[#B8B8CC]">
              Move this order to{' '}
              <span className="font-cinzel font-bold uppercase tracking-wider text-[#F0F0F0]">
                {target.replace(/_/g, ' ')}
              </span>
              ?
            </p>
            <label htmlFor="transition-note" className="block text-xs font-cinzel font-bold text-[#B8B8CC]">
              NOTE (OPTIONAL)
              <input
                id="transition-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal note for the audit trail"
                className="mt-1 w-full rounded-lg border border-[#2A2A3A] bg-[#16161F] px-4 py-2.5 text-sm font-normal normal-case tracking-normal text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none"
              />
            </label>
            {saveError ? (
              <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
                {saveError}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#CC0000] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-white transition-colors hover:bg-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'SAVING…' : 'CONFIRM'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setTarget(null);
                  setSaveError(null);
                }}
                className="rounded-lg border border-[#2A2A3A] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:opacity-50"
              >
                DISMISS
              </button>
            </div>
          </form>
        ) : null}

        {flash ? (
          <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-2 text-sm text-[#F0F0F0]">
            Status updated.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          TIMELINE
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-[#6B6B80]">No events recorded yet.</p>
        ) : (
          <ol className="relative ml-2 space-y-6 border-l border-[#2A2A3A] pl-6">
            {events.map((event, index) => (
              <li key={`${event.createdAt}-${index}`} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute top-1.5 -left-[30px] h-3 w-3 rounded-full border-2 ${
                    index === events.length - 1
                      ? 'border-[#FF6B00] bg-[#FF6B00]'
                      : 'border-[#6B6B80] bg-[#16161F]'
                  }`}
                />
                <p className="text-sm text-[#F0F0F0]">
                  <span className="font-cinzel font-bold uppercase tracking-wider">
                    {event.type.replace(/_/g, ' ')}
                  </span>
                  {event.fromStatus && event.toStatus ? (
                    <span className="ml-2 text-xs text-[#B8B8CC]">
                      {event.fromStatus.replace(/_/g, ' ')} → {event.toStatus.replace(/_/g, ' ')}
                    </span>
                  ) : null}
                </p>
                {event.message ? <p className="mt-1 text-sm text-[#B8B8CC]">{event.message}</p> : null}
                <p className="mt-1 text-xs text-[#6B6B80]">
                  {formatDateTime(event.createdAt)} · by {event.actorType.replace(/_/g, ' ')}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
