'use client';

import { useState } from 'react';
import { adminApi, type Coupon } from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminList } from '@/components/admin/use-admin-list';
import { formatDateTime } from '@/components/admin/format';

interface CouponForm {
  code: string;
  type: 'percent' | 'fixed';
  value: string;
  minSubtotalCents: string;
  maxDiscountCents: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY_FORM: CouponForm = {
  code: '',
  type: 'percent',
  value: '',
  minSubtotalCents: '',
  maxDiscountCents: '',
  usageLimit: '',
  perUserLimit: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

const inputClass =
  'w-full rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none';

const labelClass = 'mb-1 block text-xs font-cinzel font-bold text-[#B8B8CC]';
const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

function optionalInt(raw: string): number | undefined | 'invalid' {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return 'invalid';
  return Math.trunc(parsed);
}

function couponValue(coupon: Coupon): string {
  return coupon.type === 'percent' ? `${coupon.value}%` : formatPrice(coupon.value);
}

export default function AdminCouponsPage() {
  const [page, setPage] = useState(1);
  const list = useAdminList(() => adminApi.listCoupons(page), [page]);

  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const createCoupon = async () => {
    const value = optionalInt(form.value);
    if (value === undefined || value === 'invalid') {
      setCreateError('Enter a valid numeric value.');
      return;
    }
    const minSubtotalCents = optionalInt(form.minSubtotalCents);
    const maxDiscountCents = optionalInt(form.maxDiscountCents);
    const usageLimit = optionalInt(form.usageLimit);
    const perUserLimit = optionalInt(form.perUserLimit);
    if (
      minSubtotalCents === 'invalid' ||
      maxDiscountCents === 'invalid' ||
      usageLimit === 'invalid' ||
      perUserLimit === 'invalid'
    ) {
      setCreateError('Limits must be non-negative numbers.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await adminApi.createCoupon({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value,
        minSubtotalCents: minSubtotalCents ?? null,
        maxDiscountCents: maxDiscountCents ?? null,
        usageLimit: usageLimit ?? null,
        perUserLimit: perUserLimit ?? null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        isActive: form.isActive,
      });
      setForm(EMPTY_FORM);
      setFlash(`Coupon ${form.code.trim().toUpperCase()} created.`);
      list.reload();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Could not create the coupon.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    setBusyId(coupon.id);
    setToggleError(null);
    try {
      await adminApi.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      setFlash(`${coupon.code} ${coupon.isActive ? 'deactivated' : 'activated'}.`);
      list.reload();
    } catch (err: unknown) {
      setToggleError(err instanceof Error ? err.message : 'Could not update the coupon.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-8 font-bebas text-5xl tracking-wide text-[#F0F0F0]">COUPONS</h1>

      <section aria-labelledby="create-coupon-heading" className="mb-10 rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 sm:p-6">
        <h2 id="create-coupon-heading" className="mb-4 font-cinzel text-lg font-bold text-[#F0F0F0]">
          NEW COUPON
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void createCoupon();
          }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label htmlFor="coupon-code" className={labelClass}>
              CODE
            </label>
            <input
              id="coupon-code"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              required
              placeholder="SHINOBI10"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="coupon-type" className={labelClass}>
              TYPE
            </label>
            <select
              id="coupon-type"
              value={form.type}
              onChange={(e) => set('type', e.target.value === 'fixed' ? 'fixed' : 'percent')}
              className={inputClass}
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div>
            <label htmlFor="coupon-value" className={labelClass}>
              {form.type === 'percent' ? 'PERCENT OFF (%)' : 'AMOUNT OFF (CENTS)'}
            </label>
            <input
              id="coupon-value"
              type="number"
              min={form.type === 'percent' ? 1 : 0}
              max={form.type === 'percent' ? 100 : undefined}
              step={1}
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="coupon-min-subtotal" className={labelClass}>
              MIN SUBTOTAL (CENTS)
            </label>
            <input
              id="coupon-min-subtotal"
              type="number"
              min={0}
              step={1}
              value={form.minSubtotalCents}
              onChange={(e) => set('minSubtotalCents', e.target.value)}
              placeholder="—"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="coupon-max-discount" className={labelClass}>
              MAX DISCOUNT (CENTS)
            </label>
            <input
              id="coupon-max-discount"
              type="number"
              min={0}
              step={1}
              value={form.maxDiscountCents}
              onChange={(e) => set('maxDiscountCents', e.target.value)}
              placeholder="—"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="coupon-usage-limit" className={labelClass}>
                USAGE LIMIT
              </label>
              <input
                id="coupon-usage-limit"
                type="number"
                min={1}
                step={1}
                value={form.usageLimit}
                onChange={(e) => set('usageLimit', e.target.value)}
                placeholder="—"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="coupon-per-user-limit" className={labelClass}>
                PER USER
              </label>
              <input
                id="coupon-per-user-limit"
                type="number"
                min={1}
                step={1}
                value={form.perUserLimit}
                onChange={(e) => set('perUserLimit', e.target.value)}
                placeholder="—"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="coupon-starts-at" className={labelClass}>
                STARTS AT
              </label>
              <input
                id="coupon-starts-at"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="coupon-ends-at" className={labelClass}>
                ENDS AT
              </label>
              <input
                id="coupon-ends-at"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex items-end pb-1">
            <label htmlFor="coupon-active" className="flex cursor-pointer items-center gap-2 text-sm text-[#B8B8CC]">
              <input
                id="coupon-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              Active immediately
            </label>
          </div>

          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-[#CC0000] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-white transition-colors hover:bg-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'CREATING…' : 'CREATE COUPON'}
            </button>
          </div>

          {createError ? (
            <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0] sm:col-span-2 lg:col-span-3">
              {createError}
            </p>
          ) : null}
        </form>
      </section>

      {list.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {list.error}
        </p>
      ) : null}

      {toggleError ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {toggleError}
        </p>
      ) : null}

      {flash ? (
        <p role="status" aria-live="polite" className="mb-4 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {flash}
        </p>
      ) : null}

      {list.loading && !list.data ? (
        <p className="text-[#6B6B80]" role="status" aria-live="polite">
          Loading…
        </p>
      ) : list.data && list.data.items.length === 0 ? (
        <p className="text-sm text-[#6B6B80]">No coupons yet.</p>
      ) : list.data ? (
        <>
          <AdminTable headers={['CODE', 'VALUE', 'LIMITS', 'WINDOW', 'USED', 'STATUS', '']}>
            {list.data.items.map((c) => (
              <TableRow key={c.id}>
                <td className={`${td} font-mono text-xs text-[#FF6B00]`}>{c.code}</td>
                <td className={`${td} text-[#FFB800]`}>{couponValue(c)}</td>
                <td className={td}>
                  {c.usageLimit ?? '—'}
                  {c.perUserLimit ? <span className="text-xs"> · {c.perUserLimit}/user</span> : null}
                </td>
                <td className={`${td} text-xs leading-relaxed`}>
                  {c.startsAt ? formatDateTime(c.startsAt) : '—'}
                  <br />
                  {c.endsAt ? `to ${formatDateTime(c.endsAt)}` : ''}
                </td>
                <td className={td}>{c.timesUsed}</td>
                <td className={td}>
                  <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
                </td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => {
                      void toggleActive(c);
                    }}
                    className="rounded-lg border border-[#2A2A3A] px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busyId === c.id ? 'SAVING…' : c.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                  </button>
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
    </div>
  );
}
