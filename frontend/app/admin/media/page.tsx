'use client';

import { useRef, useState } from 'react';
import AdminPagination from '@/components/admin/AdminPagination';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import SectionCard from '@/components/admin/SectionCard';
import { useAdminList } from '@/components/admin/use-admin-list';
import {
  ContentError,
  contentApi,
  MEDIA_FOLDERS,
  type MediaEntry,
  type MediaFolder,
} from '@/lib/content-api';
import { btnPrimary, helpClass, inputClass, labelClass } from '@/components/admin/ui';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // keep in sync with the server cap

type FolderTab = 'all' | MediaFolder;

const TABS: readonly FolderTab[] = ['all', ...MEDIA_FOLDERS];

function formatKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function AdminMediaPage() {
  const [folder, setFolder] = useState<FolderTab>('all');
  const [page, setPage] = useState(1);
  const list = useAdminList(
    () => contentApi.listMedia(folder === 'all' ? undefined : folder, page),
    [folder, page],
  );

  const [uploadFolder, setUploadFolder] = useState<MediaFolder>('general');
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingDelete, setPendingDelete] = useState<MediaEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectFolder = (tab: FolderTab) => {
    if (tab === folder) return;
    setFlash(null);
    setFolder(tab);
    setPage(1);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Choose an image file first.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('File exceeds the 10 MB limit.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await contentApi.uploadMedia(file, uploadFolder, uploadAltText.trim() || undefined);
      setFlash(`Uploaded ${file.name}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadAltText('');
      setPage(1);
      list.reload();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || deleting) return;
    const entry = pendingDelete;
    setDeleting(true);
    setDeleteError(null);
    try {
      await contentApi.deleteMedia(entry.id);
      setPendingDelete(null);
      setFlash('Image deleted.');
      list.reload();
    } catch (err: unknown) {
      const message =
        err instanceof ContentError && err.status === 409 && err.code === 'MEDIA_IN_USE'
          ? 'In use by products — remove usage first.'
          : err instanceof Error
            ? err.message
            : 'Could not delete this image.';
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h1 className="sr-only">Media library</h1>

      <SectionCard title="UPLOAD IMAGE" className="mb-8" tone="raised">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleUpload();
          }}
          className="grid gap-4 sm:grid-cols-[1fr_1fr_180px_auto] sm:items-end"
        >
          <div>
            <label htmlFor="media-file" className={labelClass}>
              FILE (PNG · JPEG · GIF · WEBP, MAX 10 MB)
            </label>
            <input
              id="media-file"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={uploading}
              className={`${inputClass} min-h-[44px] py-2 file:mr-3 file:rounded-md file:border-0 file:bg-[#FF6B00]/15 file:px-3 file:py-1.5 file:font-cinzel file:text-xs file:font-bold file:text-[#FF6B00]`}
            />
          </div>
          <div>
            <label htmlFor="media-alt-text" className={labelClass}>
              IMAGE NAME
            </label>
            <input
              id="media-alt-text"
              type="text"
              value={uploadAltText}
              onChange={(e) => setUploadAltText(e.target.value)}
              placeholder="e.g. naruto-hero-banner"
              maxLength={200}
              disabled={uploading}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="media-folder" className={labelClass}>
              FOLDER
            </label>
            <select
              id="media-folder"
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value as MediaFolder)}
              disabled={uploading}
              className={inputClass}
            >
              {MEDIA_FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={uploading} className={`${btnPrimary} sm:mb-px`}>
            {uploading ? 'UPLOADING…' : 'UPLOAD'}
          </button>
          {uploadError ? (
            <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2.5 text-sm text-[#F0F0F0] sm:col-span-4">
              {uploadError}
            </p>
          ) : (
            <p className={`hidden sm:col-span-4 sm:block ${helpClass}`}>
              Uploaded images are served straight from the media CDN path. Leave name blank for auto-generated.
            </p>
          )}
        </form>
      </SectionCard>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}

      {!list.error && flash ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2.5 text-sm text-[#4ADE80]"
        >
          {flash}
        </p>
      ) : null}

      <nav aria-label="Folder filter" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={folder === tab}
            onClick={() => selectFolder(tab)}
            className={`inline-flex min-h-[44px] items-center rounded-lg px-4 font-cinzel text-xs font-bold uppercase tracking-wider transition-colors ${
              folder === tab
                ? 'bg-[#FF6B00]/15 text-[#FF6B00]'
                : 'border border-[#2A2A3A] text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0]'
            }`}
          >
            {tab === 'all' ? 'All folders' : tab}
          </button>
        ))}
      </nav>

      {!list.error ? (
        list.loading && !list.data ? (
          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            role="status"
            aria-live="polite"
          >
            <span className="sr-only">Loading images…</span>
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} aria-hidden="true" className="overflow-hidden rounded-xl border border-[#2A2A3A] bg-[#16161F]">
                <div className="h-44 animate-pulse bg-[#12121A]" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[#23232F]" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#23232F]" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-[#23232F]" />
                </div>
              </li>
            ))}
          </ul>
        ) : list.data && list.data.items.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
            <EmptyState
              title="NO IMAGES YET"
              description={
                folder === 'all'
                  ? 'Upload the first image to start building the library.'
                  : `Nothing in ${folder} yet. Upload an image or pick another folder.`
              }
            />
          </div>
        ) : list.data ? (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.data.items.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-[#2A2A3A] bg-[#16161F] transition-colors hover:border-[#3A3A4A]"
                >
                  <div className="flex h-44 items-center justify-center overflow-hidden bg-[#12121A]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served media URLs */}
                    <img
                      src={entry.url}
                      alt={entry.altText ?? ''}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <p className="text-xs leading-relaxed text-[#9B9BB0]">
                      {entry.width && entry.height ? `${entry.width}×${entry.height}` : 'dimensions unknown'}
                      {' · '}
                      {entry.format.toUpperCase()}
                      {' · '}
                      {formatKb(entry.bytes)}
                    </p>
                    <p className="font-mono text-xs text-[#6B6B80]">{entry.folder}</p>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        setPendingDelete(entry);
                        setDeleteError(null);
                      }}
                      className="relative mt-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#CC0000]/50 px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#FF6B6B] transition-colors hover:bg-[#CC0000]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CC0000] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      DELETE
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <AdminPagination
              page={page}
              totalPages={list.data.meta?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </>
        ) : null
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="DELETE THIS IMAGE?"
        description={
          pendingDelete
            ? `This permanently removes the ${pendingDelete.format.toUpperCase()} file (${formatKb(pendingDelete.bytes)}) from the ${pendingDelete.folder} folder. Products referencing it will lose the image.`
            : undefined
        }
        tone="danger"
        confirmLabel="DELETE IMAGE"
        busyLabel="DELETING…"
        busy={deleting}
        onClose={() => {
          setPendingDelete(null);
          setDeleteError(null);
        }}
        onConfirm={() => void handleDelete()}
      >
        {deleteError ? (
          <p role="alert" className="rounded-lg border border-[#FFB800]/50 bg-[#FFB800]/10 px-4 py-2.5 text-sm text-[#FFD966]">
            {deleteError}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
