'use client';

import { useEffect, useRef } from 'react';
import { acquireScrollLock, releaseLock } from '@/lib/scroll-lock';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('aria-hidden') || el.getAttribute('aria-hidden') === 'false',
  );
}

/**
 * Traps Tab focus inside `ref` while `active`, closes on Escape, locks body
 * scroll and restores focus to the previously focused element on cleanup.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onClose: () => void,
): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  const lockKeyRef = useRef(`focus-trap-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previousFocused = document.activeElement as HTMLElement | null;
    acquireScrollLock(lockKeyRef.current);

    const initial =
      node.querySelector<HTMLElement>('[data-autofocus]') ?? focusableIn(node)[0];
    initial?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusableIn(node);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !node.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !node.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      releaseLock(lockKeyRef.current);
      previousFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
