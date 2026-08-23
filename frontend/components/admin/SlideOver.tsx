'use client';

import type { ReactNode } from 'react';
import { useFocusTrap } from '@/components/admin/use-focus-trap';
import { IconClose } from '@/components/admin/icons';

interface SlideOverProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function SlideOver({ open, title, description, onClose, children }: SlideOverProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideover-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-[#2A2A3A] bg-[#0C0C13] shadow-[0_0_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#1D1D2A] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="slideover-title" className="font-cinzel text-base font-bold tracking-wider text-[#F0F0F0]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-[#6B6B80]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close panel"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-transparent text-[#6B6B80] transition-colors hover:border-[#2A2A3A] hover:text-[#F0F0F0]"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
