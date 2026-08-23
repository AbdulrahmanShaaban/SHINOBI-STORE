'use client';

import { useState } from 'react';
import { adminApi, type Coupon } from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import AdminPagination from '@/components/admin/AdminPagination';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import DataTableToolbar from '@/components/admin/DataTableToolbar';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import SlideOver from '@/components/admin/SlideOver';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminList } from '@/components/admin/use-admin-list';
import { formatDateTime } from '@/components/admin/format';
import {
  btnPrimary,
  btnRow,
  fieldErrorClass,
  helpClass,
  inputClass,
  inputInvalidClass,
  labelClass,
  tdClass,
} from '@/components/admin/ui';

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

type CouponErrors = Partial<Record<keyof CouponForm, string>>;

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

function validateForm(form: CouponForm): CouponErrors {
  const errors: CouponErrors = {};
  if (form.code.trim().length < 3) {
    errors.code = 'Code must be at least 3 characters.';
  }
  const value = optionalInt(form.value);
  if (value === undefined) {
    errors.value = 'Enter a numeric value.';
  } else if (value === 'invalid') {
    errors.value = 'Value must be a non-negative number.';
  } else if (form.type === 'percent' && (value < 1 || value > 100)) {
    errors.value = 'Percent must be between 1 and 100.';
  }
  for (const key of ['minSubtotalCents', 'maxDiscountCents'] as const) {
    if (optionalInt(form[key]) === 'invalid') {
      errors[key] = 'Must be a non-negative whole number.';
    }
  }
  for (const key of ['usageLimit', 'perUserLimit'] as const) {
    const parsed = optionalInt(form[key]);
    if (parsed === 'invalid' || (parsed !== undefined && parsed < 1)) {
      errors[key] = 'Must be a whole number of at least 1.';
    }
  }
  if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
    errors.endsAt = 'End must be after the start date.';
  }
  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={fieldErrorClass}>
      <span aria-hidden="true">▲</span>
      {message}
    </p>
  );
}

export default function AdminCouponsPage() {
  const [page, setPage] = useState(1);
  const list = useAdminList(() => adminApi.listCoupons(page), [page]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<CouponErrors>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [pendingToggle, setPendingToggle] = useState<Coupon | null>(null);
  const [pendingToggleSaving, setPendingToggleSaving] = useState(false);
  const [pendingToggleError, setPendingToggleError] = useState<string | null>(null);

  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openPanel = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setCreateError(null);
    setPanelOpen(true);
  };

  const createCoupon = async () => {
    const validation = validateForm(form);
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) return;

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
      setFlash(`Coupon ${form.code.trim().toUpperCase()} created.`);
      setForm(EMPTY_FORM);
      setPanelOpen(false);
      list.reload();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Could not create the coupon.');
    } finally {
      setCreating(false);
    }
  };

  const confirmToggle = async () => {
    if (!pendingToggle || pendingToggleSaving) return;
    setPendingToggleSaving(true);
    setPendingToggleError(null);
    try {
      await adminApi.updateCoupon(pendingToggle.id, { isActive: !pendingToggle.isActive });
      setFlash(`${pendingToggle.code} ${pendingToggle.isActive ? 'deactivated' : 'activated'}.`);
      setPendingToggle(null);
      list.reload();
    } catch (err: unknown) {
      setPendingToggleError(
        err instanceof Error ? err.message : 'Could not update the coupon.',
      );
    } finally {
      setPendingToggleSaving(false);
    }
  };

  const items = list.data?.items ?? [];

  return (
    <div>
      <h1 className="sr-only">Coupons</h1>

      <DataTableToolbar
        actions={
          <button type="button" onClick={openPanel} className={btnPrimary}>
            + NEW COUPON
          </button>
        }
      />

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}

      {flash ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
        >
          {flash}
        </p>
      ) : null}

      {list.loading && !list.data ? (
        <AdminTable
          headers={['CODE', 'VALUE', 'LIMITS', 'WINDOW', 'USED', 'STATUS', '']}
          isLoading
          skeletonRows={6}
        >
          <></>
        </AdminTable>
      ) : list.data && items.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
          <EmptyState
            title="NO COUPONS YET"
            description="Create the first discount code to start running promotions."
            action={
              <button type="button" onClick={openPanel} className={btnPrimary}>
                + NEW COUPON
              </button>
            }
          />
        </div>
      ) : list.data ? (
        <>
          <AdminTable headers={['CODE', 'VALUE', 'LIMITS', 'WINDOW', 'USED', 'STATUS', '']} caption="Discount coupons">
            {items.map((c) => (
              <TableRow key={c.id}>
                <td className={`${tdClass} font-mono text-xs font-bold text-[#FF6B00]`}>{c.code}</td>
                <td className={`${tdClass} whitespace-nowrap text-[#FFB800]`}>{couponValue(c)}</td>
                <td className={tdClass}>
                  {c.usageLimit ?? '—'}
                  {c.perUserLimit ? <span className="text-xs"> · {c.perUserLimit}/user</span> : null}
                </td>
                <td className={`${tdClass} text-xs leading-relaxed`}>
                  {c.startsAt ? formatDateTime(c.startsAt) : '—'}
                  <br />
                  {c.endsAt ? `to ${formatDateTime(c.endsAt)}` : ''}
                </td>
                <td className={tdClass}>{c.timesUsed}</td>
                <td className={tdClass}>
                  <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
                </td>
                <td className={`${tdClass} text-right`}>
                  <button
                    type="button"
                    disabled={pendingToggleSaving}
                    onClick={() => {
                      setPendingToggle(c);
                      setPendingToggleError(null);
                    }}
                    className={btnRow}
                  >
                    {c.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
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

      <SlideOver
        open={panelOpen}
        title="NEW COUPON"
        description="Percent codes take a percentage off; fixed codes subtract an amount in cents."
        onClose={() => {
          if (creating) return;
          setPanelOpen(false);
          setErrors({});
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void createCoupon();
          }}
          className="space-y-4"
          noValidate
        >
          <div>
            <label htmlFor="coupon-code" className={labelClass}>
              CODE <span className="text-[#FF6B00]">*</span>
            </label>
            <input
              id="coupon-code"
              data-autofocus
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              required
              placeholder="SHINOBI10"
              aria-invalid={errors.code ? true : undefined}
              className={`${errors.code ? inputInvalidClass : inputClass} font-mono`}
            />
            <FieldError message={errors.code} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                {form.type === 'percent' ? 'PERCENT OFF (%) *' : 'AMOUNT OFF (CENTS) *'}
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
                aria-invalid={errors.value ? true : undefined}
                className={errors.value ? inputInvalidClass : inputClass}
              />
              <FieldError message={errors.value} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <FieldError message={errors.minSubtotalCents} />
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
              <FieldError message={errors.maxDiscountCents} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <FieldError message={errors.usageLimit} />
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
              <FieldError message={errors.perUserLimit} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                aria-invalid={errors.endsAt ? true : undefined}
                className={errors.endsAt ? inputInvalidClass : inputClass}
              />
              <FieldError message={errors.endsAt} />
            </div>
          </div>

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

          {createError ? (
            <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
              {createError}
            </p>
          ) : null}

          <p className={helpClass}>The server re-validates every field; limits are optional.</p>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              disabled={creating}
              onClick={() => {
                setPanelOpen(false);
                setErrors({});
              }}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-[#2A2A3A] px-5 font-cinzel text-xs font-bold uppercase tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={creating}
              className={`${btnPrimary} flex-1`}
            >
              {creating ? 'CREATING…' : 'CREATE COUPON'}
            </button>
          </div>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={pendingToggle !== null}
        title={
          pendingToggle
            ? `${pendingToggle.isActive ? 'DEACTIVATE' : 'ACTIVATE'} ${pendingToggle.code}?`
            : ''
        }
        description={
          pendingToggle?.isActive
            ? 'Deactivated coupons stop applying at checkout immediately.'
            : 'Activating makes this coupon usable again.'
        }
        tone={pendingToggle?.isActive ? 'danger' : 'primary'}
        confirmLabel={pendingToggle?.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
        busyLabel="SAVING…"
        busy={pendingToggleSaving}
        onClose={() => {
          setPendingToggle(null);
          setPendingToggleError(null);
        }}
        onConfirm={() => void confirmToggle()}
      >
        {pendingToggleError ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
            {pendingToggleError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
