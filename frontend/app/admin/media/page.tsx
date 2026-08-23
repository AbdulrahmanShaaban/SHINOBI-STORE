'use client';

import { useRef, useState } from 'react';
import AdminPagination from '@/components/admin/AdminPagination';
import { useAdminList } from '@/components/admin/use-admin-list';
import {
  ContentError,
  contentApi,
  MEDIA_FOLDERS,
  type MediaEntry,
  type MediaFolder,
} from '@/lib/content-api';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // keep in sync with the server cap

type FolderTab = 'all' | MediaFolder;

const TABS: readonly FolderTab[] = ['all', ...MEDIA_FOLDERS];

const inputClass =
  'w-full rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none disabled:opacity-50';
const labelClass = 'mb-1 block text-xs font-cinzel font-bold tracking-wider text-[#B8B8CC]';

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [itemWarnings, setItemWarnings] = useState<Record<string, string>>({});

  const selectFolder = (tab: FolderTab) => {
    if (tab === folder) return;
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
      await contentApi.uploadMedia(file, uploadFolder);
      setFlash(`Uploaded ${file.name}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPage(1);
      list.reload();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (entry: MediaEntry) => {
    setBusyId(entry.id);
    setItemWarnings((w) => {
      const next = { ...w };
      delete next[entry.id];
      return next;
    });
    try {
      await contentApi.deleteMedia(entry.id);
      setFlash('Image deleted.');
      list.reload();
    } catch (err: unknown) {
      const message =
        err instanceof ContentError && err.status === 409 && err.code === 'MEDIA_IN_USE'
          ? 'In use by products — remove usage first.'
          : err instanceof Error
            ? err.message
            : 'Could not delete this image.';
      setItemWarnings((w) => ({ ...w, [entry.id]: message }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-8 font-bebas text-5xl tracking-wide text-[#F0F0F0]">MEDIA LIBRARY</h1>

      <section aria-labelledby="upload-heading" className="mb-10 rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 sm:p-6">
        <h2 id="upload-heading" className="mb-4 font-cinzel text-lg font-bold text-[#F0F0F0]">
          UPLOAD IMAGE
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleUpload();
          }}
          className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
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
              className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#FF6B00]/15 file:px-3 file:py-1.5 file:font-cinzel file:text-xs file:font-bold file:text-[#FF6B00]`}
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
          <button
            type="submit"
            disabled={uploading}
            className="h-[42px] rounded-lg bg-[#CC0000] px-5 py-2 font-cinzel text-sm font-bold tracking-wider text-white transition-colors hover:bg-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'UPLOADING…' : 'UPLOAD'}
          </button>
          {uploadError ? (
            <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0] sm:col-span-3">
              {uploadError}
            </p>
          ) : null}
        </form>
      </section>

      {list.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {list.error}
        </p>
      ) : null}

      {flash ? (
        <p role="status" aria-live="polite" className="mb-4 rounded-lg border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-4 py-2 text-sm text-[#F0F0F0]">
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
            className={`rounded-lg px-4 py-2 font-cinzel text-xs font-bold uppercase tracking-wider transition-colors ${
              folder === tab
                ? 'bg-[#FF6B00]/15 text-[#FF6B00]'
                : 'border border-[#2A2A3A] text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0]'
            }`}
          >
            {tab === 'all' ? 'All folders' : tab}
          </button>
        ))}
      </nav>

      {list.loading && !list.data ? (
        <p className="text-[#6B6B80]" role="status" aria-live="polite">
          Loading…
        </p>
      ) : list.data && list.data.items.length === 0 ? (
        <p className="text-sm text-[#6B6B80]">No images in this folder yet.</p>
      ) : list.data ? (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.data.items.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#2A2A3A] bg-[#16161F]"
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
                  <p className="text-xs leading-relaxed text-[#B8B8CC]">
                    {entry.width && entry.height ? `${entry.width}×${entry.height}` : 'dimensions unknown'}
                    {' · '}
                    {entry.format.toUpperCase()}
                    {' · '}
                    {formatKb(entry.bytes)}
                  </p>
                  <p className="font-mono text-xs text-[#6B6B80]">{entry.folder}</p>
                  {itemWarnings[entry.id] ? (
                    <p role="alert" className="rounded-lg border border-[#FFB800]/50 bg-[#FFB800]/10 px-3 py-2 text-xs text-[#FFD966]">
                      {itemWarnings[entry.id]}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => {
                      void handleDelete(entry);
                    }}
                    className="mt-auto rounded-lg border border-[#CC0000]/50 px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#CC0000] transition-colors hover:bg-[#CC0000]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busyId === entry.id ? 'DELETING…' : 'DELETE'}
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
      ) : null}
    </div>
  );
}
