import type { ContentSection } from '@/lib/content-api';

/**
 * Client-side mirror of the backend per-key config shapes
 * (backend/src/modules/content/section-schemas.ts). Field types and max
 * lengths match the server DTOs so the editor can pre-validate what the API
 * would accept; the server remains the authority.
 */

export interface ItemFieldDef {
  name: string;
  label: string;
  maxLength: number;
  required: boolean;
}

export interface ConfigFieldDef {
  name: string;
  label: string;
  kind: 'scalar' | 'slugList' | 'itemList' | 'image';
  /** scalar only */
  multiline?: boolean;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  /** slugList / itemList only */
  minItems?: number;
  maxItems?: number;
  /** itemList only */
  itemFields?: ItemFieldDef[];
}

export const SECTION_SCHEMAS: Record<string, ConfigFieldDef[]> = {
  hero: [
    { name: 'title', label: 'TITLE', kind: 'scalar', maxLength: 80, required: true },
    { name: 'subtitle', label: 'SUBTITLE', kind: 'scalar', multiline: true, maxLength: 160 },
    {
      name: 'imageUrl',
      label: 'HERO IMAGE',
      kind: 'image',
      helpText: 'Upload an image or enter a URL starting with /.',
    },
    { name: 'ctaLabel', label: 'CTA LABEL', kind: 'scalar', maxLength: 30 },
    { name: 'ctaHref', label: 'CTA LINK', kind: 'scalar', maxLength: 200, placeholder: '/products' },
  ],
  featured_products: [
    {
      name: 'productSlugs',
      label: 'PRODUCT SLUGS',
      kind: 'slugList',
      maxItems: 8,
      helpText: 'One product slug per line (max 8). Leave empty to keep the storefront default.',
    },
  ],
  featured_characters: [
    {
      name: 'items',
      label: 'CHARACTERS',
      kind: 'itemList',
      minItems: 1,
      maxItems: 6,
      itemFields: [
        { name: 'name', label: 'NAME', maxLength: 40, required: true },
        { name: 'slug', label: 'SLUG', maxLength: 120, required: true },
        { name: 'imageUrl', label: 'IMAGE URL', maxLength: 500, required: false },
        { name: 'tagline', label: 'TAGLINE', maxLength: 80, required: false },
        { name: 'skills', label: 'SKILLS (comma-separated)', maxLength: 200, required: false },
      ],
    },
  ],
  trending_anime: [
    {
      name: 'animeSlugs',
      label: 'ANIME SLUGS',
      kind: 'slugList',
      minItems: 1,
      maxItems: 8,
      helpText: 'One anime slug per line (max 8). Required.',
    },
  ],
  collections: [
    {
      name: 'items',
      label: 'COLLECTIONS',
      kind: 'itemList',
      minItems: 1,
      maxItems: 8,
      itemFields: [
        { name: 'title', label: 'TITLE', maxLength: 40, required: true },
        { name: 'href', label: 'LINK', maxLength: 200, required: true },
        { name: 'imageUrl', label: 'IMAGE URL', maxLength: 500, required: false },
      ],
    },
  ],
  madara: [
    {
      name: 'defaultImg',
      label: 'DEFAULT IMAGE',
      kind: 'image',
      helpText: 'Upload or enter a URL. Empty keeps the bundled artwork.',
    },
    {
      name: 'jutsuImg',
      label: 'JUTSU IMAGE',
      kind: 'image',
      helpText: 'Upload or enter a URL. Empty keeps the bundled artwork.',
    },
    {
      name: 'sixPathsImg',
      label: 'SIX PATHS IMAGE',
      kind: 'image',
      helpText: 'Upload or enter a URL. Empty keeps the bundled artwork.',
    },
  ],
  banner: [
    { name: 'title', label: 'TITLE', kind: 'scalar', maxLength: 60, required: true },
    { name: 'message', label: 'MESSAGE', kind: 'scalar', multiline: true, maxLength: 140 },
    { name: 'imageUrl', label: 'BANNER IMAGE', kind: 'image' },
    { name: 'ctaLabel', label: 'CTA LABEL', kind: 'scalar', maxLength: 30 },
    { name: 'ctaHref', label: 'CTA LINK', kind: 'scalar', maxLength: 200 },
  ],
  testimonials: [
    {
      name: 'items',
      label: 'TESTIMONIALS',
      kind: 'itemList',
      minItems: 1,
      maxItems: 6,
      itemFields: [
        { name: 'quote', label: 'QUOTE', maxLength: 240, required: true },
        { name: 'author', label: 'AUTHOR', maxLength: 40, required: true },
      ],
    },
  ],
};

export function isKnownSectionKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(SECTION_SCHEMAS, key);
}

// ───────────────────── form state & serialization ─────────────────────

export type ItemRow = Record<string, string>;
export type FormValues = Record<string, string | string[] | ItemRow[]>;

function scalarString(config: Record<string, unknown>, name: string): string {
  const value = config[name];
  return typeof value === 'string' ? value : '';
}

/** Builds initial form state from the stored config (defensive against junk). */
export function initialValues(section: ContentSection, fields: ConfigFieldDef[]): FormValues {
  const config = section.config ?? {};
  const values: FormValues = {};
  for (const field of fields) {
    if (field.kind === 'scalar') {
      values[field.name] = scalarString(config, field.name);
    } else if (field.kind === 'slugList') {
      const raw = config[field.name];
      values[field.name] = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
    } else {
      const raw = config[field.name];
      const defs = field.itemFields ?? [];
      values[field.name] = Array.isArray(raw)
        ? raw.map((entry) => {
            const row: ItemRow = {};
            for (const def of defs) {
              row[def.name] =
                entry !== null && typeof entry === 'object' && typeof (entry as Record<string, unknown>)[def.name] === 'string'
                  ? ((entry as Record<string, unknown>)[def.name] as string)
                  : '';
            }
            return row;
          })
        : [];
    }
  }
  return values;
}

export type BuildResult =
  | { ok: true; config: Record<string, unknown> }
  | { ok: false; error: string };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isEmptyRow(row: ItemRow): boolean {
  return Object.values(row).every((v) => v.trim() === '');
}

/**
 * Converts form state into the JSON payload for PATCH …/config.
 * Client-side validation mirrors the backend DTO constraints; the server
 * response remains the final word on validity.
 */
export function buildConfig(fields: ConfigFieldDef[], values: FormValues): BuildResult {
  const config: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const field of fields) {
    if (field.kind === 'scalar') {
      const text = typeof values[field.name] === 'string' ? (values[field.name] as string) : '';
      const trimmed = text.trim();
      if (!trimmed) {
        if (field.required) errors.push(`${field.label} is required.`);
        continue;
      }
      if (field.maxLength && trimmed.length > field.maxLength) {
        errors.push(`${field.label} must be at most ${field.maxLength} characters.`);
        continue;
      }
      config[field.name] = trimmed;
    } else if (field.kind === 'slugList') {
      const list = Array.isArray(values[field.name]) ? (values[field.name] as string[]) : [];
      const slugs = list.map((s) => s.trim()).filter(Boolean);
      if (slugs.length < (field.minItems ?? 0)) {
        errors.push(`${field.label} needs at least ${field.minItems} entry.`);
        continue;
      }
      if (field.maxItems && slugs.length > field.maxItems) {
        errors.push(`${field.label} allows at most ${field.maxItems} entries.`);
        continue;
      }
      const bad = slugs.find((s) => !SLUG_PATTERN.test(s));
      if (bad) {
        errors.push(`${field.label}: '${bad}' must be a lowercase kebab-case slug.`);
        continue;
      }
      if (slugs.length > 0 || field.required) config[field.name] = slugs;
    } else {
      const rowsRaw = Array.isArray(values[field.name]) ? (values[field.name] as ItemRow[]) : [];
      const defs = field.itemFields ?? [];
      const items: Record<string, string>[] = [];

      for (const [index, row] of rowsRaw.entries()) {
        if (isEmptyRow(row)) continue; // silently drop fully-empty rows
        const item: Record<string, string> = {};
        let rowValid = true;
        for (const def of defs) {
          const trimmed = (row[def.name] ?? '').trim();
          if (!trimmed && def.required) {
            errors.push(`${field.label} #${index + 1}: ${def.label} is required.`);
            rowValid = false;
            break;
          }
          if (trimmed.length > def.maxLength) {
            errors.push(
              `${field.label} #${index + 1}: ${def.label} must be at most ${def.maxLength} characters.`,
            );
            rowValid = false;
            break;
          }
          if (trimmed) item[def.name] = trimmed;
        }
        if (!rowValid) continue;
        items.push(item);
      }

      if (items.length < (field.minItems ?? 0)) {
        errors.push(`${field.label} needs at least ${field.minItems} complete entry.`);
        continue;
      }
      if (field.maxItems && items.length > field.maxItems) {
        errors.push(`${field.label} allows at most ${field.maxItems} entries.`);
        continue;
      }
      config[field.name] = items;
    }
  }

  if (errors.length > 0) return { ok: false, error: errors.join('\n') };
  return { ok: true, config };
}
