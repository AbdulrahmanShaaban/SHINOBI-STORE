'use client';

import { IconAlert, IconRetry } from '@/components/admin/icons';
import { btnGhost } from '@/components/admin/ui';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export default function ErrorState({ message, onRetry, title = 'SOMETHING WENT WRONG' }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-[#CC0000]/50 bg-[#CC0000]/[0.06] px-4 py-10 text-center"
    >
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-full border border-[#CC0000]/50 bg-[#CC0000]/15 text-[#FF6B6B]"
      >
        <IconAlert className="h-5 w-5" />
      </span>
      <div>
        <p className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#F0F0F0]">
          {title}
        </p>
        <p className="mx-auto mt-1.5 max-w-md break-words text-sm leading-relaxed text-[#B8B8CC]">
          {message}
        </p>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={`${btnGhost} mt-1`}>
          <IconRetry className="h-4 w-4" />
          RETRY
        </button>
      ) : null}
    </div>
  );
}
