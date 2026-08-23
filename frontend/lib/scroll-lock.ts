/**
 * Shared body scroll-lock with reference counting.
 *
 * Multiple overlays (cart drawer, navbar menu, mobile filters) can request a
 * scroll lock at the same time. A naive `body.style.overflow = 'hidden'`
 * means the first surface to close unlocks the page while another is still
 * open. This counter ensures `hidden` is applied once and cleared only when
 * the last holder releases.
 */

let holders = 0;

/** Lock body scrolling. Safe to call multiple times; only the first call mutates the DOM. */
export function acquireScrollLock(): void {
  if (typeof document === 'undefined') return;
  holders += 1;
  if (holders === 1) document.body.style.overflow = 'hidden';
}

/** Release one hold on the scroll lock. Scrolling resumes when the count reaches zero. */
export function releaseLock(): void {
  if (typeof document === 'undefined') return;
  if (holders === 0) return;
  holders -= 1;
  if (holders === 0) document.body.style.overflow = '';
}
