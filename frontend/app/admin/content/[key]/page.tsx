'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  contentApi,
  type ContentSection,
} from '@/lib/content-api';
import {
  buildConfig,
  initialValues,
  isKnownSectionKey,
  SECTION_SCHEMAS,
  type ConfigFieldDef,
  type FormValues,
  type ItemRow,
} from '@/components/admin/content/section-schemas';

const inputClass =
  'w-full rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none disabled:opacity-50';

const labelClass = 'mb-1 block text-xs font-cinzel font-bold tracking-wider text-[#B8B8CC]';
const helpClass = 'mt-1 block text-xs text-[#6B6B80]';

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

  const [values, setValues] = useState<FormValues>({});
  const [rawJson, setRawJson] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
  }, [key]);

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
            className={inputClass}
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

  const renderItemField = (field: ConfigFieldDef) => {
    const rows = Array.isArray(values[field.name]) ? (values[field.name] as ItemRow[]) : [];
    const atMax = Boolean(field.maxItems && rows.length >= field.maxItems);
    return (
      <fieldset>
        <legend className={labelClass}>
          {field.label}
          <span className="ml-2 font-normal normal-case text-[#6B6B80]">
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
                  className="rounded-lg border border-[#CC0000]/50 px-3 py-1 font-cinzel text-xs font-bold tracking-wider text-[#CC0000] transition-colors hover:bg-[#CC0000]/10"
                >
                  REMOVE
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(field.itemFields ?? []).map((def) => {
                  const defId = `field-${field.name}-${index}-${def.name}`;
                  return (
                    <div key={def.name}>
                      <label htmlFor={defId} className="mb-1 block text-xs font-cinzel font-bold text-[#B8B8CC]">
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
          className="mt-3 rounded-lg border border-[#2A2A3A] px-4 py-2 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + ADD ENTRY
        </button>
      </fieldset>
    );
  };

  if (loading) {
    return (
      <p className="text-[#6B6B80]" role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (loadError) {
    return (
      <div>
        <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {loadError}
        </p>
        <Link href="/admin/content" className="mt-4 inline-block font-cinzel text-sm font-bold text-[#FF6B00] hover:underline">
          ← BACK TO CONTENT
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <h1 className="mb-4 font-bebas text-4xl tracking-wide text-[#F0F0F0]">
          SECTION NOT FOUND
        </h1>
        <p className="text-sm text-[#B8B8CC]">
          No homepage section exists with the key <code className="font-mono text-[#FF6B00]">{key}</code>.
        </p>
        <Link href="/admin/content" className="mt-4 inline-block font-cinzel text-sm font-bold text-[#FF6B00] hover:underline">
          ← BACK TO CONTENT
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/content" className="inline-block font-cinzel text-sm font-bold text-[#FF6B00] hover:underline">
        ← CONTENT
      </Link>
      <h1 className="mb-8 mt-4 font-bebas text-4xl tracking-wide text-[#F0F0F0] sm:text-5xl">
        EDIT {sectionTitle(key)}
      </h1>

      {saveError ? (
        <pre role="alert" className="mb-4 whitespace-pre-wrap rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {saveError}
        </pre>
      ) : null}

      {flash ? (
        <p role="status" aria-live="polite" className="mb-4 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          Saved.
        </p>
      ) : null}

      {schemaDriven && fields ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-6 rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 sm:p-6"
        >
          {fields.map((field) => {
            if (field.kind === 'scalar') return renderScalarField(field);
            if (field.kind === 'slugList') return renderSlugListField(field);
            return renderItemField(field);
          })}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#CC0000] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-white transition-colors hover:bg-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'SAVING…' : 'SAVE'}
            </button>
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              aria-expanded={showPreview}
              className="rounded-lg border border-[#2A2A3A] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0]"
            >
              {showPreview ? 'HIDE JSON PREVIEW' : 'JSON PREVIEW'}
            </button>
          </div>

          {showPreview ? (
            <div>
              <p className={`${helpClass} mb-2`}>Exactly what SAVE would send:</p>
              {preview.error ? (
                <pre aria-live="polite" className="overflow-x-auto rounded-lg border border-[#CC0000]/50 bg-[#12121A] p-4 font-mono text-xs text-[#CC0000]">
                  {preview.error}
                </pre>
              ) : (
                <pre aria-live="polite" className="max-h-96 overflow-auto rounded-lg border border-[#2A2A3A] bg-[#12121A] p-4 font-mono text-xs text-[#B8B8CC]">
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
          className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 sm:p-6"
        >
          <p className="mb-4 text-sm text-[#B8B8CC]">
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#CC0000] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-white transition-colors hover:bg-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'SAVING…' : 'SAVE'}
            </button>
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              aria-expanded={showPreview}
              className="rounded-lg border border-[#2A2A3A] px-5 py-2.5 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0]"
            >
              {showPreview ? 'HIDE JSON PREVIEW' : 'JSON PREVIEW'}
            </button>
          </div>
          {showPreview ? (
            <div className="mt-4">
              <p className={`${helpClass} mb-2`}>Exactly what SAVE would send:</p>
              {preview.error ? (
                <pre aria-live="polite" className="overflow-x-auto rounded-lg border border-[#CC0000]/50 bg-[#12121A] p-4 font-mono text-xs text-[#CC0000]">
                  {preview.error}
                </pre>
              ) : (
                <pre aria-live="polite" className="max-h-96 overflow-auto rounded-lg border border-[#2A2A3A] bg-[#12121A] p-4 font-mono text-xs text-[#B8B8CC]">
                  {preview.json}
                </pre>
              )}
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
