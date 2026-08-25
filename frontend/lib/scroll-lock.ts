/**
 * Shared body scroll-lock, keyed per consumer.
 *
 * Multiple overlays (cart drawer, navbar menu, mobile filters, search,
 * gallery zoom) can request a scroll lock at the same time. A naive
 * `body.style.overflow = 'hidden'` means the first surface to close unlocks
 * the page while another is still open — and a bare increment/decrement
 * counter means ONE mismatched acquire/release pair permanently wedges the
 * lock for every other consumer (the "scroll frozen until refresh" bug).
 *
 * Keys make both failure modes harmless: acquiring the same key twice holds
 * once, releasing an un-held key is a no-op, and each consumer releases only
 * its own hold.
 */

const holders = new Set<string>();

/** Lock body scrolling. Idempotent per key; only the first key mutates the DOM. */
export function acquireScrollLock(key: string): void {
  if (typeof document === 'undefined') return;
  if (holders.has(key)) return;
  holders.add(key);
  if (holders.size === 1) document.body.style.overflow = 'hidden';
}

/** Release one consumer's hold. Scrolling resumes when no keys remain. */
export function releaseLock(key: string): void {
  if (typeof document === 'undefined') return;
  if (!holders.delete(key)) return;
  if (holders.size === 0) document.body.style.overflow = '';
}
