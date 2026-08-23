'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import { useAdminList } from '@/components/admin/use-admin-list';
import { contentApi, type ContentSection, type SectionPatch } from '@/lib/content-api';

const KEY_LABELS: Record<string, string> = {
  hero: 'HERO',
  featured_products: 'FEATURED PRODUCTS',
  featured_characters: 'FEATURED CHARACTERS',
  trending_anime: 'TRENDING ANIME',
  collections: 'COLLECTIONS',
  banner: 'BANNER',
  testimonials: 'TESTIMONIALS',
};

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

function sectionLabel(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/_/g, ' ').toUpperCase();
}

export default function AdminContentPage() {
  const list = useAdminList(() => contentApi.getSections(), []);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});

  const patchSection = async (key: string, patch: SectionPatch, successMessage: string) => {
    setBusyKey(key);
    setActionError(null);
    try {
      await contentApi.updateSection(key, patch);
      setFlash(successMessage);
      list.reload();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not update the section.');
    } finally {
      setBusyKey(null);
    }
  };

  const commitSortOrder = (section: ContentSection) => {
    const raw = orderDrafts[section.key];
    if (raw === undefined) return;
    const parsed = Number(raw.trim());
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
      setActionError('Sort order must be an integer between 0 and 999.');
      setOrderDrafts((d) => {
        const next = { ...d };
        delete next[section.key];
        return next;
      });
      return;
    }
    if (parsed === section.sortOrder) return;
    void patchSection(section.key, { sortOrder: parsed }, `${sectionLabel(section.key)} order set to ${parsed}.`);
  };

  const toggleVisible = (section: ContentSection) => {
    void patchSection(
      section.key,
      { isVisible: !section.isVisible },
      `${sectionLabel(section.key)} is now ${section.isVisible ? 'hidden' : 'visible'}.`,
    );
  };

  return (
    <div>
      <h1 className="mb-2 font-bebas text-5xl tracking-wide text-[#F0F0F0]">HOMEPAGE CONTENT</h1>
      <p className="mb-8 text-sm text-[#6B6B80]">
        Visibility, order and copy for each storefront section. Public edits go live after the
        content cache TTL (about a minute).
      </p>

      {list.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {list.error}
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {actionError}
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
      ) : list.data && list.data.length === 0 ? (
        <p className="text-sm text-[#6B6B80]">No sections returned by the API.</p>
      ) : list.data ? (
        <AdminTable headers={['SECTION', 'STATUS', 'SORT ORDER', '']}>
          {list.data.map((section) => {
            const busy = busyKey === section.key;
            const draft = orderDrafts[section.key];
            return (
              <TableRow key={section.key}>
                <td className={`${td} font-cinzel font-bold tracking-wider text-[#F0F0F0]`}>
                  {sectionLabel(section.key)}
                  <span className="ml-2 font-mono text-xs font-normal text-[#6B6B80]">{section.key}</span>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <span className={section.isVisible ? 'text-[#7CFC00]' : 'text-[#CC0000]'}>
                      {section.isVisible ? 'VISIBLE' : 'HIDDEN'}
                    </span>
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => toggleVisible(section)}
                      className="rounded-lg border border-[#2A2A3A] px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy ? 'SAVING…' : section.isVisible ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </td>
                <td className={td}>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    step={1}
                    aria-label={`Sort order for ${sectionLabel(section.key)}`}
                    value={draft ?? String(section.sortOrder)}
                    onChange={(e) =>
                      setOrderDrafts((d) => ({ ...d, [section.key]: e.target.value }))
                    }
                    onBlur={() => commitSortOrder(section)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    disabled={busy}
                    className="w-20 rounded-lg border border-[#2A2A3A] bg-[#12121A] px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none disabled:opacity-50"
                  />
                </td>
                <td className={`${td} text-right`}>
                  <Link
                    href={`/admin/content/${encodeURIComponent(section.key)}`}
                    className="inline-block rounded-lg border border-[#FF6B00]/60 bg-[#FF6B00]/10 px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#FF6B00] transition-colors hover:bg-[#FF6B00]/20"
                  >
                    EDIT
                  </Link>
                </td>
              </TableRow>
            );
          })}
        </AdminTable>
      ) : null}
    </div>
  );
}
