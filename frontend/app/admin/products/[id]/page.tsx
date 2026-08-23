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
import StatusBadge from '@/components/admin/StatusBadge';

const STATUS_QUICK_SETS = ['draft', 'active', 'archived'] as const;

const inputClass =
  'w-full rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none';

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('draft');

  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

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
  }, [id]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const patch = async (body: ProductUpdateInput, quick?: string) => {
    if (quick) setQuickSaving(quick);
    else setSaving(true);
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
    } finally {
      if (quick) setQuickSaving(null);
      else setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-[#6B6B80]" role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (loadError || !product) {
    return (
      <div>
        <Link href="/admin/products" className="text-sm text-[#FF6B00] hover:underline underline-offset-4">
          ← Back to products
        </Link>
        <p role="alert" className="mt-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {loadError ?? 'Product not found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm text-[#FF6B00] hover:underline underline-offset-4">
        ← Back to products
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <h1 className="font-bebas text-4xl tracking-wide text-[#F0F0F0] sm:text-5xl">
          EDIT PRODUCT
        </h1>
        {typeof product.status === 'string' ? <StatusBadge status={product.status} /> : null}
      </header>

      <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 text-sm">
        <dt className="text-[#6B6B80]">Slug</dt>
        <dd className="break-all font-mono text-xs">{typeof product.slug === 'string' ? product.slug : '—'}</dd>
        <dt className="text-[#6B6B80]">Price from</dt>
        <dd className="text-[#FFB800]">{formatPrice(product.priceFromCents)}</dd>
      </dl>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void patch({ name, description });
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="product-name" className="mb-1 block text-xs font-cinzel font-bold text-[#B8B8CC]">
            NAME
          </label>
          <input
            id="product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={120}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="product-description" className="mb-1 block text-xs font-cinzel font-bold text-[#B8B8CC]">
            DESCRIPTION
          </label>
          <textarea
            id="product-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={5000}
            className={`${inputClass} resize-y`}
          />
        </div>

        {saveError ? (
          <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
            {saveError}
          </p>
        ) : null}
        {flash ? (
          <p role="status" aria-live="polite" className="rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-2 text-sm text-[#F0F0F0]">
            Saved.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving || quickSaving !== null}
          className="rounded-lg bg-[#CC0000] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-white transition-colors hover:bg-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'SAVING…' : 'SAVE CHANGES'}
        </button>
      </form>

      <section aria-labelledby="status-heading" className="mt-10 rounded-xl border border-dashed border-[#2A2A3A] bg-[#12121A] p-5">
        <h2 id="status-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          QUICK SET STATUS
        </h2>
        <div className="flex flex-wrap gap-3">
          {STATUS_QUICK_SETS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={saving || quickSaving !== null}
              onClick={() => {
                void patch({ status: s }, s).then((ok) => {
                  if (ok) setStatus(s);
                });
              }}
              className={`rounded-lg px-4 py-2 font-cinzel text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                status === s
                  ? 'bg-[#FF6B00] text-white'
                  : 'border border-[#2A2A3A] text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0]'
              }`}
            >
              {quickSaving === s ? 'SAVING…' : s}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
