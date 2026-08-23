'use client';

import type { ReactNode } from 'react';
import { useFocusTrap } from '@/components/admin/use-focus-trap';
import { IconAlert, IconCheck } from '@/components/admin/icons';
import { btnDanger, btnGhost, btnPrimary } from '@/components/admin/ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  tone?: 'danger' | 'primary';
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  /** Extra fields rendered above the actions (e.g. note / reason inputs). */
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  tone = 'danger',
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  busyLabel = 'WORKING…',
  busy = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = `confirm-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const descId = `${titleId}-desc`;

  const guardedClose = () => {
    if (!busy) onClose();
  };
  const trapRef = useFocusTrap<HTMLDivElement>(open, guardedClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={guardedClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm motion-reduce:transition-none"
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`relative w-full max-w-lg rounded-xl border bg-[#12121A] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)] ${
          tone === 'danger' ? 'border-[#CC0000]/50' : 'border-[#2A2A3A]'
        }`}
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
              tone === 'danger'
                ? 'border-[#CC0000]/50 bg-[#CC0000]/15 text-[#FF6B6B]'
                : 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]'
            }`}
          >
            {tone === 'danger' ? <IconAlert className="h-5 w-5" /> : <IconCheck className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-cinzel text-base font-bold tracking-wider text-[#F0F0F0]">
              {title}
            </h2>
            {description ? (
              <div id={descId} className="mt-1.5 text-sm leading-relaxed text-[#B8B8CC]">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {children ? <div className="mt-5 space-y-3">{children}</div> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" data-autofocus={children ? undefined : true} disabled={busy} onClick={guardedClose} className={btnGhost}>
            {cancelLabel}
          </button>
          <button
            type="button"
            data-autofocus={children ? true : undefined}
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
            className={tone === 'danger' ? btnDanger : btnPrimary}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
