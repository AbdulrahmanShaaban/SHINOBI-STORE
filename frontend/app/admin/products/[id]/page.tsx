'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  adminApi,
  type AdminProductDetail,
  type ProductUpdateInput,
} from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import ErrorState from '@/components/admin/ErrorState';
import SectionCard from '@/components/admin/SectionCard';
import { SkeletonText } from '@/components/admin/Skeleton';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  helpClass,
  inputClass,
  inputInvalidClass,
  labelClass,
} from '@/components/admin/ui';

const STATUS_QUICK_SETS = ['draft', 'active', 'archived'] as const;

const NAME_MIN = 3;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 5000;

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [nameTouched, setNameTouched] = useState(false);

  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const [pendingStatus, setPendingStatus] = useState<(typeof STATUS_QUICK_SETS)[number] | null>(
    null,
  );
  const [pendingStatusSaving, setPendingStatusSaving] = useState(false);
  const [pendingStatusError, setPendingStatusError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    adminApi
      .getProduct(id)
      .then((p) => {
        if (!alive) return;
        setProduct(p);
        setName(typeof p.name === 'string' ? p.name : '');
        setDescription(typeof p.description === 'string' ? p.description : '');
        setStatus(typeof p.status === 'string' ? p.status : 'draft');
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load the product.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, retryNonce]);

  const retry = () => setRetryNonce((n) => n + 1);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const trimmedName = name.trim();
  const nameError =
    trimmedName.length < NAME_MIN
      ? `Name must be at least ${NAME_MIN} characters.`
      : trimmedName.length > NAME_MAX
        ? `Name must be at most ${NAME_MAX} characters.`
        : null;
  const descriptionError =
    description.length > DESCRIPTION_MAX
      ? `Description must be at most ${DESCRIPTION_MAX} characters.`
      : null;
  const formValid = nameError === null && descriptionError === null;

  const patch = async (body: ProductUpdateInput): Promise<boolean> => {
    setSaveError(null);
    try {
      await adminApi.updateProduct(id, body);
      setFlash(true);
      adminApi
        .getProduct(id)
        .then(setProduct)
        .catch(() => undefined);
      return true;
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the product.');
      return false;
    }
  };

  if (loading && !product) {
    return (
      <div className="max-w-3xl space-y-6" role="status" aria-live="polite">
        <span className="sr-only">Loading product…</span>
        <SkeletonText lines={1} className="max-w-[200px]" />
        <div className="h-24 animate-pulse rounded-xl bg-[#16161F]" />
        <div className="h-72 animate-pulse rounded-xl bg-[#16161F]" />
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div>
        <Link
          href="/admin/products"
          className="mb-5 inline-flex min-h-[44px] items-center gap-2 font-cinzel text-sm font-bold text-[#FF6B00] hover:underline underline-offset-4"
        >
          ← BACK TO PRODUCTS
        </Link>
        <ErrorState
          message={loadError ?? 'Product not found.'}
          onRetry={loadError ? retry : undefined}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/products"
        className="mb-5 inline-flex min-h-[44px] items-center gap-2 font-cinzel text-sm font-bold text-[#FF6B00] hover:underline underline-offset-4"
      >
        ← BACK TO PRODUCTS
      </Link>

      <header className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-[#2A2A3A] bg-[#16161F] px-5 py-4">
        <h1 className="font-bebas text-4xl tracking-wide text-[#F0F0F0]">EDIT PRODUCT</h1>
        {typeof product.status === 'string' ? <StatusBadge status={product.status} /> : null}
      </header>

      <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-xl border border-[#2A2A3A] bg-[#12121A] p-5 text-sm">
        <dt className="text-[#6B6B80]">Slug</dt>
        <dd className="break-all font-mono text-xs">
          {typeof product.slug === 'string' ? product.slug : '—'}
        </dd>
        <dt className="text-[#6B6B80]">Price from</dt>
        <dd className="text-[#FFB800]">{formatPrice(product.priceFromCents)}</dd>
      </dl>

      <SectionCard title="DETAILS" tone="raised">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setNameTouched(true);
            if (!formValid || saving || quickSaving !== null) return;
            void (async () => {
              setSaving(true);
              await patch({ name, description });
              setSaving(false);
            })();
          }}
          className="space-y-5"
          noValidate
        >
          <div>
            <label htmlFor="product-name" className={labelClass}>
              NAME <span className="text-[#FF6B00]">*</span>
            </label>
            <input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              required
              minLength={NAME_MIN}
              maxLength={NAME_MAX}
              aria-invalid={(nameTouched && nameError !== null) || undefined}
              aria-describedby={nameTouched && nameError ? 'product-name-error' : undefined}
              className={
                nameTouched && nameError !== null ? inputInvalidClass : inputClass
              }
            />
            <p className={`${helpClass} mt-1`}>
              {trimmedName.length}/{NAME_MAX} characters · min {NAME_MIN}
            </p>
            {nameTouched && nameError ? (
              <p id="product-name-error" role="alert" className="mt-1 text-xs text-[#FF6B6B]">
                {nameError}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="product-description" className={labelClass}>
              DESCRIPTION
            </label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={DESCRIPTION_MAX}
              aria-invalid={descriptionError !== null || undefined}
              className={inputClass}
            />
            <p className={`${helpClass} mt-1`}>
              {description.length}/{DESCRIPTION_MAX} characters
            </p>
            {descriptionError ? (
              <p role="alert" className="mt-1 text-xs text-[#FF6B6B]">
                {descriptionError}
              </p>
            ) : null}
          </div>

          {saveError ? (
            <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
              {saveError}
            </p>
          ) : null}
          {flash ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
            >
              Saved.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving || quickSaving !== null || (nameTouched && !formValid)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#FF6B00] px-5 font-cinzel text-xs font-bold uppercase tracking-wider text-[#160B02] transition-colors hover:bg-[#FF8433] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'SAVING…' : 'SAVE CHANGES'}
          </button>
        </form>
      </SectionCard>

      <section
        aria-labelledby="status-heading"
        className="mt-8 rounded-xl border border-dashed border-[#2A2A3A] bg-[#12121A] p-5"
      >
        <h2 id="status-heading" className="mb-3 font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]">
          QUICK SET STATUS
        </h2>
        <div className="flex flex-wrap gap-3">
          {STATUS_QUICK_SETS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={saving || quickSaving !== null || pendingStatusSaving}
              onClick={() => {
                setPendingStatus(s);
                setPendingStatusError(null);
              }}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 font-cinzel text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                status === s
                  ? 'bg-[#FF6B00] text-[#160B02]'
                  : 'border border-[#2A2A3A] text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0]'
              }`}
            >
              {quickSaving === s ? 'SAVING…' : s}
            </button>
          ))}
        </div>
        <p className={`${helpClass} mt-3`}>
          Changes go through a confirmation step; the storefront only lists active products.
        </p>
      </section>

      <ConfirmDialog
        open={pendingStatus !== null}
        title={`SET STATUS TO ${(pendingStatus ?? '').toUpperCase()}`}
        description={
          pendingStatus === 'archived'
            ? 'Archiving hides this product from the storefront catalog everywhere.'
            : pendingStatus === 'draft'
              ? 'Drafts are hidden from the storefront until activated.'
              : 'Activating makes this product visible in the storefront catalog.'
        }
        tone={pendingStatus === 'archived' ? 'danger' : 'primary'}
        confirmLabel="SET STATUS"
        busyLabel="SAVING…"
        busy={pendingStatusSaving}
        onClose={() => {
          setPendingStatus(null);
          setPendingStatusError(null);
        }}
        onConfirm={() => {
          if (!pendingStatus) return;
          void (async () => {
            setPendingStatusSaving(true);
            setQuickSaving(pendingStatus);
            setPendingStatusError(null);
            try {
              await adminApi.updateProduct(id, { status: pendingStatus });
              setStatus(pendingStatus);
              setFlash(true);
              setPendingStatus(null);
              adminApi
                .getProduct(id)
                .then(setProduct)
                .catch(() => undefined);
            } catch (err: unknown) {
              setPendingStatusError(
                err instanceof Error ? err.message : 'Could not update the product.',
              );
            } finally {
              setPendingStatusSaving(false);
              setQuickSaving(null);
            }
          })();
        }}
      >
        {pendingStatusError ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
            {pendingStatusError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
