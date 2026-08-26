'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  contentApi,
  type ContentSection,
  type MediaEntry,
  type MediaFolder,
} from '@/lib/content-api';
import { adminApi } from '@/lib/admin-api';
import {
  buildConfig,
  initialValues,
  isKnownSectionKey,
  SECTION_SCHEMAS,
  type ConfigFieldDef,
  type FormValues,
  type ItemRow,
} from '@/components/admin/content/section-schemas';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import SectionCard from '@/components/admin/SectionCard';
import { SkeletonText } from '@/components/admin/Skeleton';
import { pushToast } from '@/components/shared/Toast';
import {
  btnGhost,
  helpClass,
  inputClass,
  labelClass,
} from '@/components/admin/ui';

function sectionTitle(key: string): string {
  return key.replace(/_/g, ' ').toUpperCase();
}

export default function AdminSectionEditPage() {
  const params = useParams<{ key: string }>();
  const key = params.key ?? '';
  const router = useRouter();

  const fields: ConfigFieldDef[] | undefined = useMemo(
    () => SECTION_SCHEMAS[key],
    [key],
  );
  const schemaDriven = isKnownSectionKey(key);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const [values, setValues] = useState<FormValues>({});
  const [rawJson, setRawJson] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [mediaPickerField, setMediaPickerField] = useState<string | null>(null);
  const [mediaPickerItems, setMediaPickerItems] = useState<MediaEntry[]>([]);
  const [mediaPickerLoading, setMediaPickerLoading] = useState(false);
  const [mediaPickerPage, setMediaPickerPage] = useState(1);
  const [mediaPickerHasMore, setMediaPickerHasMore] = useState(true);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  // Reset per-key state during render when the route param changes (React's
  // documented "adjust state on prop change" pattern) so stale copy, errors,
  // or not-found flags from another section never leak into this one.
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    setSaveError(null);
    setValues({});
    setRawJson('');
    setFlash(false);
    setShowPreview(false);
  }

  useEffect(() => {
    let alive = true;
    contentApi
      .getSections()
      .then((rows: ContentSection[]) => {
        if (!alive) return;
        const section = rows.find((r) => r.key === key);
        if (!section) {
          setNotFound(true);
        } else if (SECTION_SCHEMAS[key]) {
          setValues(initialValues(section, SECTION_SCHEMAS[key]));
        } else {
          setRawJson(JSON.stringify(section.config ?? {}, null, 2));
        }
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load the section.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key, retryNonce]);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  /** What SAVE would send right now — powers the live JSON preview. */
  const preview = useMemo<{ json: string; error: string | null }>(() => {
    if (schemaDriven && fields) {
      const result = buildConfig(fields, values);
      return result.ok
        ? { json: JSON.stringify(result.config, null, 2), error: null }
        : { json: '', error: result.error };
    }
    try {
      const parsed: unknown = JSON.parse(rawJson);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { json: '', error: 'Config must be a JSON object.' };
      }
      return { json: JSON.stringify(parsed, null, 2), error: null };
    } catch {
      return { json: '', error: 'Config is not valid JSON yet.' };
    }
  }, [schemaDriven, fields, values, rawJson]);

  const setScalar = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));

  const setSlugList = (name: string, text: string) =>
    setValues((v) => ({ ...v, [name]: text.split('\n') }));

  const slugListText = (value: string | string[] | ItemRow[] | undefined): string =>
    Array.isArray(value) && typeof value[0] === 'string' ? (value as string[]).join('\n') : '';

  const addItem = (field: ConfigFieldDef) =>
    setValues((v) => {
      const rows = Array.isArray(v[field.name]) ? [...(v[field.name] as ItemRow[])] : [];
      if (field.maxItems && rows.length >= field.maxItems) return v;
      const row: ItemRow = {};
      for (const def of field.itemFields ?? []) row[def.name] = '';
      rows.push(row);
      return { ...v, [field.name]: rows };
    });

  const removeItem = (field: ConfigFieldDef, index: number) =>
    setValues((v) => {
      const rows = Array.isArray(v[field.name]) ? [...(v[field.name] as ItemRow[])] : [];
      rows.splice(index, 1);
      return { ...v, [field.name]: rows };
    });

  const setItemField = (field: ConfigFieldDef, index: number, name: string, value: string) =>
    setValues((v) => {
      const rows = Array.isArray(v[field.name]) ? [...(v[field.name] as ItemRow[])] : [];
      if (!rows[index]) return v;
      rows[index] = { ...rows[index], [name]: value };
      return { ...v, [field.name]: rows };
    });

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    let payload: Record<string, unknown>;
    if (schemaDriven && fields) {
      const result = buildConfig(fields, values);
      if (!result.ok) {
        setSaveError(result.error);
        setSaving(false);
        return;
      }
      payload = result.config;
    } else {
      try {
        const parsed: unknown = JSON.parse(rawJson);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Config must be a JSON object.');
        }
        payload = parsed as Record<string, unknown>;
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Config is not valid JSON.');
        setSaving(false);
        return;
      }
    }
    try {
      await contentApi.updateSection(key, { config: payload });
      setFlash(true);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the section.');
    } finally {
      setSaving(false);
    }
  };

  const renderScalarField = (field: ConfigFieldDef) => {
    const value = typeof values[field.name] === 'string' ? (values[field.name] as string) : '';
    const id = `field-${field.name}`;
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {field.label}
          {field.required ? <span className="ml-1 text-[#FF6B00]">*</span> : null}
        </label>
        {field.multiline ? (
          <textarea
            id={id}
            rows={3}
            maxLength={field.maxLength}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => setScalar(field.name, e.target.value)}
            className={`${inputClass} resize-y`}
          />
        ) : (
          <input
            id={id}
            type="text"
            maxLength={field.maxLength}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => setScalar(field.name, e.target.value)}
            className={inputClass}
          />
        )}
        {field.helpText ? <span className={helpClass}>{field.helpText}</span> : null}
      </div>
    );
  };

  const renderSlugListField = (field: ConfigFieldDef) => {
    const id = `field-${field.name}`;
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {field.label}
          {field.required ? <span className="ml-1 text-[#FF6B00]">*</span> : null}
        </label>
        <textarea
          id={id}
          rows={5}
          spellCheck={false}
          value={slugListText(values[field.name])}
          placeholder={'naruto-shippuden\none-piece'}
          onChange={(e) => setSlugList(field.name, e.target.value)}
          className={`${inputClass} font-mono`}
        />
        <span className={helpClass}>
          One slug per line{field.maxItems ? ` (max ${field.maxItems})` : ''}. Lowercase kebab-case.
        </span>
      </div>
    );
  };

  const handleImageUpload = async (field: ConfigFieldDef, file: File) => {
    setUploadingField(field.name);
    try {
      const entry = await contentApi.uploadMedia(file, 'general');
      setScalar(field.name, entry.url);
    } catch (err: unknown) {
      pushToast({ title: 'UPLOAD FAILED', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
    } finally {
      setUploadingField(null);
    }
  };

  const openMediaPicker = async (fieldName: string) => {
    setMediaPickerField(fieldName);
    setMediaPickerPage(1);
    setMediaPickerItems([]);
    setMediaPickerHasMore(true);
    setMediaPickerLoading(true);
    try {
      const result = await contentApi.listMedia('general', 1);
      setMediaPickerItems(result.items);
      setMediaPickerHasMore(result.meta.page < result.meta.totalPages);
    } catch {
      pushToast({ title: 'ERROR', description: 'Failed to load media', variant: 'error' });
    } finally {
      setMediaPickerLoading(false);
    }
  };

  const loadMoreMedia = async () => {
    const nextPage = mediaPickerPage + 1;
    setMediaPickerLoading(true);
    try {
      const result = await contentApi.listMedia('general', nextPage);
      setMediaPickerItems((prev) => [...prev, ...result.items]);
      setMediaPickerPage(nextPage);
      setMediaPickerHasMore(result.meta.page < result.meta.totalPages);
    } catch {
      pushToast({ title: 'ERROR', description: 'Failed to load more media', variant: 'error' });
    } finally {
      setMediaPickerLoading(false);
    }
  };

  const renderImageField = (field: ConfigFieldDef) => {
    const value = typeof values[field.name] === 'string' ? (values[field.name] as string) : '';
    const id = `field-${field.name}`;
    const isUploading = uploadingField === field.name;
    const isPickerOpen = mediaPickerField === field.name;
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {field.label}
          {field.required ? <span className="ml-1 text-[#FF6B00]">*</span> : null}
        </label>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              id={id}
              type="text"
              value={value}
              placeholder="/sections/… or https://…"
              onChange={(e) => setScalar(field.name, e.target.value)}
              className={inputClass}
            />
            {field.helpText ? <span className={helpClass}>{field.helpText}</span> : null}
          </div>
          <button
            type="button"
            onClick={() => isPickerOpen ? setMediaPickerField(null) : openMediaPicker(field.name)}
            className="shrink-0 h-[44px] px-4 rounded-lg border border-[#2A2A3A] font-cinzel text-xs font-bold uppercase tracking-wider text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0] transition-colors"
          >
            {isPickerOpen ? 'CLOSE' : 'BROWSE'}
          </button>
          <label className="shrink-0 h-[44px] px-4 rounded-lg border border-[#2A2A3A] font-cinzel text-xs font-bold uppercase tracking-wider text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0] transition-colors flex items-center cursor-pointer">
            {isUploading ? 'UPLOADING…' : 'UPLOAD'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(field, file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {isPickerOpen && (
          <div className="mt-3 rounded-lg border border-[#2A2A3A] bg-[#12121A] p-3">
            {mediaPickerLoading && mediaPickerItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6B6B80] font-inter">Loading media…</div>
            ) : mediaPickerItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6B6B80] font-inter">No media in the general folder yet.</div>
            ) : (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-60 overflow-y-auto">
                  {mediaPickerItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setScalar(field.name, item.url);
                        setMediaPickerField(null);
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        value === item.url
                          ? 'border-[#FF6B00]'
                          : 'border-transparent hover:border-[#FF6B00]/50'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.altText ?? ''} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                {mediaPickerHasMore && (
                  <button
                    type="button"
                    onClick={loadMoreMedia}
                    disabled={mediaPickerLoading}
                    className="mt-2 w-full h-8 rounded border border-[#2A2A3A] text-xs font-cinzel font-bold text-[#6B6B80] hover:text-[#FF6B00] hover:border-[#FF6B00] transition-colors"
                  >
                    {mediaPickerLoading ? 'LOADING…' : 'LOAD MORE'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {value ? (
          <div className="mt-2 relative w-full max-w-[200px] h-[100px] rounded-lg overflow-hidden border border-[#2A2A3A] bg-[#12121A]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
        ) : null}
      </div>
    );
  };

  const renderItemField = (field: ConfigFieldDef) => {
    const rows = Array.isArray(values[field.name]) ? (values[field.name] as ItemRow[]) : [];
    const atMax = Boolean(field.maxItems && rows.length >= field.maxItems);
    return (
      <fieldset>
        <legend className={labelClass}>
          {field.label}
          <span className="ml-2 font-normal normal-case tracking-normal text-[#6B6B80]">
            {rows.length}
            {field.maxItems ? `/${field.maxItems}` : ''}
          </span>
        </legend>
        <div className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <div
              key={index}
              className="rounded-xl border border-[#2A2A3A] bg-[#12121A] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-cinzel text-xs font-bold tracking-wider text-[#6B6B80]">
                  ENTRY {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(field, index)}
                  className="relative rounded-lg border border-[#CC0000]/50 px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#FF6B6B] transition-colors after:absolute after:-inset-x-1 after:-inset-y-1.5 after:content-[''] hover:bg-[#CC0000]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CC0000]"
                >
                  REMOVE
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(field.itemFields ?? []).map((def) => {
                  const defId = `field-${field.name}-${index}-${def.name}`;
                  if (def.kind === 'image-inline') {
                    const imgVal = row[def.name] ?? '';
                    const imgUploading = uploadingField === `${field.name}-${index}-${def.name}`;
                    return (
                      <div key={def.name}>
                        <label htmlFor={defId} className="mb-1 block font-cinzel text-xs font-bold text-[#B8B8CC]">
                          {def.label}
                          {def.required ? <span className="ml-1 text-[#FF6B00]">*</span> : null}
                        </label>
                        <div className="flex gap-2 items-start">
                          <input
                            id={defId}
                            type="text"
                            maxLength={def.maxLength}
                            value={imgVal}
                            placeholder="URL or upload"
                            onChange={(e) => setItemField(field, index, def.name, e.target.value)}
                            className={`${inputClass} flex-1`}
                          />
                          <label className="shrink-0 h-[44px] px-3 rounded-lg border border-[#2A2A3A] font-cinzel text-[10px] font-bold uppercase tracking-wider text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0] transition-colors flex items-center cursor-pointer">
                            {imgUploading ? '…' : 'UPLOAD'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={imgUploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const upKey = `${field.name}-${index}-${def.name}`;
                                setUploadingField(upKey);
                                try {
                                  const folder: MediaFolder = key === 'collections' ? 'collections' : 'characters';
                                  const entry = await contentApi.uploadMedia(file, folder);
                                  setItemField(field, index, def.name, entry.url);
                                } catch (err: unknown) {
                                  console.error('[MediaUpload]', err);
                                  const msg = err instanceof Error ? err.message : String(err);
                                  pushToast({ title: 'UPLOAD FAILED', description: msg, variant: 'error' });
                                } finally {
                                  setUploadingField(null);
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {imgVal ? (
                          <div className="mt-2 w-full max-w-[120px] h-[60px] rounded-lg overflow-hidden border border-[#2A2A3A] bg-[#12121A]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgVal} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                  if (def.kind === 'tags') {
                    const rawTags = row[def.name] ?? '';
                    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : [];
                    return (
                      <div key={def.name} className="sm:col-span-2">
                        <label className="mb-1 block font-cinzel text-xs font-bold text-[#B8B8CC]">
                          {def.label}
                          {def.required ? <span className="ml-1 text-[#FF6B00]">*</span> : null}
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {tags.map((tag, ti) => (
                            <span
                              key={`${tag}-${ti}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[11px] font-cinzel font-bold text-[#FF6B00]"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = tags.filter((_, i) => i !== ti).join(', ');
                                  setItemField(field, index, def.name, next);
                                }}
                                className="ml-0.5 text-[#FF6B00]/60 hover:text-[#FF6B00] transition-colors"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          id={defId}
                          type="text"
                          placeholder="Type a skill and press Enter"
                          maxLength={def.maxLength}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val && !tags.includes(val)) {
                                const next = tags.length > 0 ? `${rawTags}, ${val}` : val;
                                setItemField(field, index, def.name, next);
                              }
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                          className={inputClass}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={def.name}>
                      <label htmlFor={defId} className="mb-1 block font-cinzel text-xs font-bold text-[#B8B8CC]">
                        {def.label}
                        {def.required ? <span className="ml-1 text-[#FF6B00]">*</span> : null}
                      </label>
                      <input
                        id={defId}
                        type="text"
                        maxLength={def.maxLength}
                        value={row[def.name] ?? ''}
                        onChange={(e) => setItemField(field, index, def.name, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => addItem(field)}
          disabled={atMax}
          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#2A2A3A] px-4 font-cinzel text-xs font-bold uppercase tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          + ADD ENTRY
        </button>
      </fieldset>
    );
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6" role="status" aria-live="polite">
        <span className="sr-only">Loading section…</span>
        <SkeletonText lines={1} className="max-w-sm" />
        <div className="h-96 animate-pulse rounded-xl bg-[#16161F]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <Link
          href="/admin/content"
          className="mb-5 inline-flex min-h-[44px] items-center gap-2 font-cinzel text-sm font-bold text-[#FF6B00] hover:underline underline-offset-4"
        >
          ← BACK TO CONTENT
        </Link>
        <ErrorState message={loadError} onRetry={retry} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <h1 className="sr-only">Section not found</h1>
        <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
          <EmptyState
            title="SECTION NOT FOUND"
            description={`No homepage section exists with the key “${key}”.`}
            action={
              <Link href="/admin/content" className={btnGhost}>
                ← BACK TO CONTENT
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/content"
        className="mb-5 inline-flex min-h-[44px] items-center gap-2 font-cinzel text-sm font-bold text-[#FF6B00] hover:underline underline-offset-4"
      >
        ← CONTENT
      </Link>
      <header className="mb-8 rounded-xl border border-[#2A2A3A] bg-[#16161F] px-5 py-4">
        <h1 className="font-bebas text-4xl tracking-wide text-[#F0F0F0]">EDIT {sectionTitle(key)}</h1>
      </header>

      {saveError ? (
        <pre role="alert" className="mb-4 whitespace-pre-wrap rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm leading-relaxed text-[#F0F0F0]">
          {saveError}
        </pre>
      ) : null}

      {flash ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
        >
          Saved. Public pages pick it up within a minute.
        </p>
      ) : null}

      <SectionCard padded={false}>
        {schemaDriven && fields ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="space-y-6 p-5 sm:p-6"
          >
            {fields.map((field) => {
              if (field.kind === 'scalar') return <div key={field.name}>{renderScalarField(field)}</div>;
              if (field.kind === 'slugList') return <div key={field.name}>{renderSlugListField(field)}</div>;
              if (field.kind === 'image') return <div key={field.name}>{renderImageField(field)}</div>;
              return <div key={field.name}>{renderItemField(field)}</div>;
            })}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#FF6B00] px-5 font-cinzel text-xs font-bold uppercase tracking-wider text-[#160B02] transition-colors hover:bg-[#FF8433] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'SAVING…' : 'SAVE'}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                aria-expanded={showPreview}
                className={btnGhost}
              >
                {showPreview ? 'HIDE JSON PREVIEW' : 'JSON PREVIEW'}
              </button>
            </div>

            {showPreview ? (
              <div>
                <p className={`${helpClass} mb-2`}>Exactly what SAVE would send:</p>
                {preview.error ? (
                  <pre aria-live="polite" className="overflow-x-auto rounded-lg border border-[#CC0000]/50 bg-[#12121A] p-4 font-mono text-xs leading-relaxed text-[#FF6B6B]">
                    {preview.error}
                  </pre>
                ) : (
                  <pre aria-live="polite" className="max-h-96 overflow-auto rounded-lg border border-[#2A2A3A] bg-[#12121A] p-4 font-mono text-xs leading-relaxed text-[#B8B8CC]">
                    {preview.json}
                  </pre>
                )}
              </div>
            ) : null}
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="space-y-4 p-5 sm:p-6"
          >
            <p className="text-sm text-[#B8B8CC]">
              No form schema is registered for this key — edit the raw JSON below.
            </p>
            <textarea
              aria-label={`Raw JSON config for ${sectionTitle(key)}`}
              rows={14}
              spellCheck={false}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              className={`${inputClass} font-mono`}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#FF6B00] px-5 font-cinzel text-xs font-bold uppercase tracking-wider text-[#160B02] transition-colors hover:bg-[#FF8433] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'SAVING…' : 'SAVE'}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                aria-expanded={showPreview}
                className={btnGhost}
              >
                {showPreview ? 'HIDE JSON PREVIEW' : 'JSON PREVIEW'}
              </button>
            </div>
            {showPreview ? (
              <div>
                <p className={`${helpClass} mb-2`}>Exactly what SAVE would send:</p>
                {preview.error ? (
                  <pre aria-live="polite" className="overflow-x-auto rounded-lg border border-[#CC0000]/50 bg-[#12121A] p-4 font-mono text-xs leading-relaxed text-[#FF6B6B]">
                    {preview.error}
                  </pre>
                ) : (
                  <pre aria-live="polite" className="max-h-96 overflow-auto rounded-lg border border-[#2A2A3A] bg-[#12121A] p-4 font-mono text-xs leading-relaxed text-[#B8B8CC]">
                    {preview.json}
                  </pre>
                )}
              </div>
            ) : null}
          </form>
        )}
      </SectionCard>
    </div>
  );
}
