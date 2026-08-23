'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import { useAdminList } from '@/components/admin/use-admin-list';
import { contentApi, type ContentSection, type SectionPatch } from '@/lib/content-api';
import { btnRow, tdClass } from '@/components/admin/ui';

const KEY_LABELS: Record<string, string> = {
  hero: 'HERO',
  featured_products: 'FEATURED PRODUCTS',
  featured_characters: 'FEATURED CHARACTERS',
  trending_anime: 'TRENDING ANIME',
  collections: 'COLLECTIONS',
  banner: 'BANNER',
  testimonials: 'TESTIMONIALS',
};

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
      <h1 className="sr-only">Homepage content</h1>
      <p className="-mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-[#6B6B80]">
        Visibility, order and copy for each storefront section. Public edits go live after the
        content cache TTL (about a minute).
      </p>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}

      {!list.error && actionError ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0]">
          {actionError}
        </p>
      ) : null}
      {!list.error && flash ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
        >
          {flash}
        </p>
      ) : null}

      {!list.error ? (
        list.loading && !list.data ? (
          <AdminTable headers={['SECTION', 'STATUS', 'SORT ORDER', '']} isLoading skeletonRows={7}>
            <></>
          </AdminTable>
        ) : list.data && list.data.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState
              title="NO SECTIONS RETURNED"
              description="The API returned no homepage sections. Check the backend configuration."
            />
          </div>
        ) : list.data ? (
          <AdminTable headers={['SECTION', 'STATUS', 'SORT ORDER', '']} caption="Homepage sections" zebra>
            {list.data.map((section) => {
              const busy = busyKey === section.key;
              const draft = orderDrafts[section.key];
              return (
                <TableRow key={section.key}>
                  <td className={`${tdClass} font-cinzel text-sm font-bold tracking-wider text-[#F0F0F0]`}>
                    {sectionLabel(section.key)}
                    <span className="ml-2 font-mono text-xs font-normal tracking-normal text-[#6B6B80]">
                      {section.key}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-cinzel text-[11px] font-bold uppercase tracking-wider ${
                          section.isVisible ? 'text-[#4ADE80]' : 'text-[#FF6B6B]'
                        }`}
                      >
                        {section.isVisible ? 'VISIBLE' : 'HIDDEN'}
                      </span>
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => toggleVisible(section)}
                        className={btnRow}
                      >
                        {busy ? 'SAVING…' : section.isVisible ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </td>
                  <td className={tdClass}>
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
                      className="w-20 rounded-lg border border-[#2A2A3A] bg-[#12121A] px-3 py-2.5 text-sm text-[#F0F0F0] transition-colors focus:border-[#FF6B00] focus:outline-none disabled:opacity-50"
                    />
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <Link
                      href={`/admin/content/${encodeURIComponent(section.key)}`}
                      className="relative inline-flex min-h-[36px] items-center justify-center whitespace-nowrap rounded-lg border border-[#FF6B00]/60 bg-[#FF6B00]/10 px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#FF6B00] transition-colors after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] hover:bg-[#FF6B00]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B00]"
                    >
                      EDIT
                    </Link>
                  </td>
                </TableRow>
              );
            })}
          </AdminTable>
        ) : null
      ) : null}
    </div>
  );
}
