'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

/**
 * Shared toast notifications.
 *
 * Imperative API for any trigger point (client code):
 *   pushToast({ title: 'ADDED TO CART', description: productName, variant: 'success' })
 *
 * <ToastHost /> must be mounted once (root layout); it renders nothing until
 * a toast exists, so SSR markup and first client render always agree.
 */

export type ToastVariant = 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  push: (options: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const MAX_STACK = 4;
const AUTO_DISMISS_MS = 3500;
const EXIT_MS = 180;

// Client-side only: incremented inside event handlers, never during render,
// so SSR output stays deterministic (empty list -> null host).
let nextToastId = 0;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: ({ title, description, variant = 'success' }) =>
    set((state) => {
      const toast: ToastItem = { id: ++nextToastId, title, description, variant };
      const stacked = [...state.toasts, toast];
      // Newest wins; drop the oldest beyond the stack cap.
      return { toasts: stacked.slice(Math.max(0, stacked.length - MAX_STACK)) };
    }),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Fire-and-forget notification from any client module or event handler. */
export function pushToast(options: ToastOptions): void {
  useToastStore.getState().push(options);
}

function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  // hidden -> mounted offscreen; visible -> slid in; leaving -> exit fade.
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'leaving'>('hidden');
  const countdownRef = useRef<number | undefined>(undefined);
  const exitRef = useRef<number | undefined>(undefined);
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const startedAtRef = useRef(0);

  const beginExit = useCallback(() => {
    setPhase((current) => {
      if (current === 'leaving') return current;
      window.clearTimeout(exitRef.current);
      exitRef.current = window.setTimeout(() => dismiss(toast.id), EXIT_MS);
      return 'leaving';
    });
  }, [dismiss, toast.id]);

  // Restart (or start) the auto-dismiss countdown from what remains.
  const startCountdown = useCallback(() => {
    window.clearTimeout(countdownRef.current);
    startedAtRef.current = Date.now();
    countdownRef.current = window.setTimeout(beginExit, remainingRef.current);
  }, [beginExit]);

  useEffect(() => {
    // One frame after mount so the initial transform transition actually runs.
    const raf = requestAnimationFrame(() => setPhase('visible'));
    startCountdown();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(countdownRef.current);
      window.clearTimeout(exitRef.current);
    };
  }, [startCountdown]);

  const isError = toast.variant === 'error';

  return (
    <div
      {...(isError ? { role: 'alert', 'aria-live': 'assertive' } : {})}
      onMouseEnter={() => {
        // Pause the countdown while hovered; remember the remainder.
        window.clearTimeout(countdownRef.current);
        remainingRef.current = Math.max(
          500,
          remainingRef.current - (Date.now() - startedAtRef.current),
        );
      }}
      onMouseLeave={startCountdown}
      className={`pointer-events-auto flex min-h-[44px] items-start gap-3 rounded-lg border bg-[#16161F] p-3 shadow-lg shadow-black/40 transition-all duration-300 ease-out motion-reduce:transition-none ${
        isError
          ? 'border-[#CC0000]/60 border-l-[#CC0000]'
          : 'border-[#2A2A3A] border-l-2 border-l-[#FF6B00]'
      } ${
        phase === 'visible'
          ? 'translate-y-0 opacity-100'
          : phase === 'leaving'
            ? 'translate-x-4 opacity-0'
            : 'translate-y-3 opacity-0'
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 shrink-0 ${isError ? 'text-[#CC0000]' : 'text-[#FF6B00]'}`}
      >
        {isError ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
      </span>

      <div className="flex min-w-0 flex-col">
        <p className="font-cinzel text-sm font-bold tracking-wide text-[#F0F0F0]">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 font-inter text-xs leading-snug text-[#6B6B80] break-words">
            {toast.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={beginExit}
        aria-label="Dismiss notification"
        className="ml-auto shrink-0 rounded-md p-1 text-[#6B6B80] transition-colors hover:text-[#F0F0F0] focus-visible:text-[#FF6B00]"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default ToastHost;
