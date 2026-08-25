'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  adminApi,
  type AdminProductDetail,
  type ProductImageRow,
  type ProductUpdateInput,
} from '@/lib/admin-api';
import { contentApi } from '@/lib/content-api';
import { formatPrice } from '@/lib/money';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import ErrorState from '@/components/admin/ErrorState';
import SectionCard from '@/components/admin/SectionCard';
import { SkeletonText } from '@/components/admin/Skeleton';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  btnGhost,
  btnPrimary,
  btnRow,
  btnRowDanger,
  helpClass,
  inputClass,
  inputInvalidClass,
  labelClass,
} from '@/components/admin/ui';

const STATUS_QUICK_SETS = ['draft', 'active', 'archived'] as const;

const NAME_MIN = 3;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 5000;

/** Mirrors the server cap on PUT /admin/products/:id/images. */
const MAX_IMAGES = 10;
/** Mirrors the media endpoint's hard upload cap. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface ImageDraftItem {
  key: string;
  url: string;
  mediaId: string | null;
  altText: string;
  isPrimary: boolean;
}

let draftKeyCounter = 0;
const nextDraftKey = () => `img-${Date.now().toString(36)}-${(draftKeyCounter += 1)}`;

function toImageDraft(images: ProductImageRow[] | undefined): ImageDraftItem[] {
  if (!Array.isArray(images)) return [];
  return images.map((img) => ({
    key: img.id,
    url: img.url,
    mediaId: img.mediaId,
    altText: img.altText ?? '',
    isPrimary: img.isPrimary,
  }));
}

function sameImages(a: ImageDraftItem[], b: ImageDraftItem[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (item, i) =>
        item.url === b[i]?.url &&
        item.mediaId === b[i]?.mediaId &&
        item.altText === b[i]?.altText &&
        item.isPrimary === b[i]?.isPrimary,
    )
  );
}

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

  const [imageDraft, setImageDraft] = useState<ImageDraftItem[]>([]);
  const [savedImages, setSavedImages] = useState<ImageDraftItem[]>([]);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [imagesUploadStep, setImagesUploadStep] = useState<string | null>(null);
  const [imagesSaving, setImagesSaving] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [imagesFlash, setImagesFlash] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

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
        setImageDraft(toImageDraft(p.images));
        setSavedImages(toImageDraft(p.images));
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
    if (!flash && !imagesFlash) return;
    const timer = setTimeout(() => {
      setFlash(false);
      setImagesFlash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [flash, imagesFlash]);

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

  const imagesDirty = !sameImages(savedImages, imageDraft);

  const updateImageAt = (index: number, item: Partial<ImageDraftItem>) => {
    setImageDraft((draft) => draft.map((row, i) => (i === index ? { ...row, ...item } : row)));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImageDraft((draft) => {
      const target = index + direction;
      if (target < 0 || target >= draft.length) return draft;
      const next = [...draft];
      const moved = next[index];
      if (!moved || !next[target]) return draft;
      next[index] = next[target];
      next[target] = moved;
      return next;
    });
  };

  const removeImage = (key: string) => {
    setImageDraft((draft) => draft.filter((row) => row.key !== key));
  };

  const markPrimary = (key: string) => {
    setImageDraft((draft) => draft.map((row) => ({ ...row, isPrimary: row.key === key })));
  };

  const uploadImageFiles = async (files: File[]): Promise<void> => {
    setImagesError(null);
    setImagesUploading(true);
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (!file) continue;
        setImagesUploadStep(`Uploading ${i + 1} of ${files.length}…`);
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(`${file.name} exceeds the 10 MB limit.`);
        }
        const entry = await contentApi.uploadMedia(file, 'products');
        setImageDraft((draft) => [
          ...draft,
          { key: nextDraftKey(), url: entry.url, mediaId: entry.id, altText: '', isPrimary: false },
        ]);
      }
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    } catch (err: unknown) {
      // Already-uploaded files stay in the draft — only the failure surfaces.
      setImagesError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setImagesUploading(false);
      setImagesUploadStep(null);
    }
  };

  const handleImageFilesChosen = () => {
    const files = Array.from(imageFileInputRef.current?.files ?? []);
    if (files.length === 0) {
      setImagesError('Choose at least one image file.');
      return;
    }
    const room = MAX_IMAGES - imageDraft.length;
    if (files.length > room) {
      setImagesError(
        `A product can have at most ${MAX_IMAGES} images — ${room > 0 ? `only ${room} more fit` : 'the list is full'}.`,
      );
      return;
    }
    void uploadImageFiles(files);
  };

  const saveImages = async (): Promise<void> => {
    setImagesError(null);
    setImagesSaving(true);
    try {
      await adminApi.setProductImages(
        id,
        imageDraft.map((item) => ({
          url: item.url,
          mediaId: item.mediaId ?? undefined,
          altText: item.altText.trim() || undefined,
          isPrimary: item.isPrimary,
        })),
      );
      setImagesFlash(true);
      // Re-sync from server truth without clobbering unsaved DETAILS edits.
      const fresh = await adminApi.getProduct(id);
      setProduct(fresh);
      const next = toImageDraft(fresh.images);
      setImageDraft(next);
      setSavedImages(next);
    } catch (err: unknown) {
      setImagesError(err instanceof Error ? err.message : 'Could not save the images.');
    } finally {
      setImagesSaving(false);
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

      <SectionCard title="IMAGES" tone="raised" className="mt-8">
        <div className="space-y-5">
          <div>
            <label htmlFor="product-images-file" className={labelClass}>
              ADD IMAGE(S) (PNG · JPEG · GIF · WEBP, MAX 10 MB EACH)
            </label>
            <input
              id="product-images-file"
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={imagesUploading || imagesSaving}
              onChange={handleImageFilesChosen}
              className="sr-only"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={imagesUploading || imagesSaving || imageDraft.length >= MAX_IMAGES}
                onClick={() => imageFileInputRef.current?.click()}
                className={btnGhost}
              >
                {imagesUploading ? 'UPLOADING…' : '+ ADD IMAGE(S)'}
              </button>
              {imagesUploading && imagesUploadStep ? (
                <p role="status" aria-live="polite" className="text-xs text-[#FFB800]">
                  {imagesUploadStep}
                </p>
              ) : null}
            </div>
            <p id="product-images-help" className={`${helpClass} mt-1`}>
              Up to {MAX_IMAGES} images. Order below is the storefront order; mark one image as
              PRIMARY for the product card.
            </p>
          </div>

          {imageDraft.length === 0 && !imagesUploading ? (
            <p className="rounded-lg border border-dashed border-[#2A2A3A] bg-[#16161F] px-4 py-6 text-center text-sm text-[#6B6B80]">
              No images yet — add product shots so storefront cards and the detail page have
              visuals.
            </p>
          ) : null}

          {imageDraft.length > 0 ? (
            <ul className="space-y-3">
              {imageDraft.map((item, index) => (
                <li key={item.key} className="rounded-lg border border-[#2A2A3A] bg-[#16161F] p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#2A2A3A] bg-[#12121A]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served media URLs */}
                      <img
                        src={item.url}
                        alt={item.altText || `Product image ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <label
                        htmlFor={`product-image-alt-${index}`}
                        className="sr-only"
                      >
                        Alt text for image {index + 1}
                      </label>
                      <input
                        id={`product-image-alt-${index}`}
                        value={item.altText}
                        onChange={(e) => updateImageAt(index, { altText: e.target.value })}
                        placeholder="Alt text (screen readers, SEO)"
                        maxLength={300}
                        disabled={imagesSaving}
                        aria-label={`Alt text for image ${index + 1}`}
                        className={inputClass}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider transition-colors ${
                            item.isPrimary
                              ? 'border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00]'
                              : 'border-[#2A2A3A] text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="product-image-primary"
                            checked={item.isPrimary}
                            onChange={() => markPrimary(item.key)}
                            disabled={imagesSaving}
                            aria-label={`Mark image ${index + 1} as primary`}
                            className="accent-[#FF6B00]"
                          />
                          PRIMARY
                        </span>
                        <button
                          type="button"
                          onClick={() => moveImage(index, -1)}
                          disabled={index === 0 || imagesSaving}
                          aria-label={`Move image ${index + 1} up`}
                          className={btnRow}
                        >
                          ↑ UP
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(index, 1)}
                          disabled={index === imageDraft.length - 1 || imagesSaving}
                          aria-label={`Move image ${index + 1} down`}
                          className={btnRow}
                        >
                          ↓ DOWN
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(item.key)}
                          disabled={imagesSaving}
                          aria-label={`Remove image ${index + 1}`}
                          className={`${btnRowDanger} ml-auto`}
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {imagesError ? (
            <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
              {imagesError}
            </p>
          ) : null}
          {imagesFlash ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
            >
              Saved.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={imagesSaving || imagesUploading || !imagesDirty}
              onClick={() => void saveImages()}
              className={btnPrimary}
            >
              {imagesSaving ? 'SAVING…' : 'SAVE IMAGES'}
            </button>
            {imagesDirty && !imagesSaving ? (
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#FFB800]/40 bg-[#FFB800]/10 px-2.5 py-0.5 font-cinzel text-[11px] font-bold uppercase tracking-wider text-[#FFB800]">
                Unsaved changes
              </span>
            ) : null}
          </div>
        </div>
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
