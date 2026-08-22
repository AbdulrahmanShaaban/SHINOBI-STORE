'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  selectSubtotalCents,
  selectTotalItems,
  useCartStore,
} from '@/lib/cart-store';
import { formatPrice } from '@/lib/money';

/**
 * Cart drawer. Lines are variant-aware and persisted in localStorage;
 * quantity is clamped by the availability snapshot taken at add-time.
 */
export default function Cart() {
  const { isOpen, closeCart, lines, setQuantity, removeLine } = useCartStore();
  const subtotalCents = useCartStore(selectSubtotalCents);
  const totalItems = useCartStore(selectTotalItems);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus management: focus the close button on open, restore later.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
      if (event.key === 'Tab' && drawerRef.current) {
        // Minimal focus trap.
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [isOpen, closeCart]);

  useGSAP(
    () => {
      if (!isOpen) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.cart-drawer', { x: '100%', duration: 0.5, ease: 'power3.out' });
        gsap.from('.cart-overlay', { opacity: 0, duration: 0.3 });
      });
      return () => mm.revert();
    },
    { dependencies: [isOpen] },
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="cart-overlay fixed inset-0 bg-black/50 z-40"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Cart Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="cart-drawer fixed right-0 top-0 h-full w-full max-w-md bg-[#12121A] z-50 border-l border-[#CC0000]/30 flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A3A]">
          <h2 className="text-2xl font-cinzel font-bold text-[#F0F0F0]">
            YOUR CART
            <span className="ml-2 font-bebas text-lg text-[#FFB800]">({totalItems})</span>
          </h2>
          <button
            ref={closeRef}
            onClick={closeCart}
            aria-label="Close cart"
            className="p-2 hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18 L18 6 M6 6 L18 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <p className="text-[#6B6B80] font-inter">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="h-10 px-6 rounded-lg border border-[#FF6B00]/60 text-[#FF6B00] font-cinzel font-bold text-sm hover:bg-[#FF6B00]/10 transition-colors"
              >
                CONTINUE BROWSING
              </button>
            </div>
          ) : (
            <ul className="space-y-4" aria-label="Cart items">
              {lines.map((line) => (
                <li key={line.variantId} className="flex gap-4 bg-[#16161F] p-4 rounded-lg">
                  <Link href={`/products/${line.slug}`} onClick={closeCart} className="shrink-0">
                    <div className="w-20 h-20 bg-[#0A0A0F] rounded flex items-center justify-center overflow-hidden">
                      {line.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span aria-hidden="true" className="font-bebas text-3xl text-[#6B6B80]">忍</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${line.slug}`}
                      onClick={closeCart}
                      className="font-cinzel font-bold mb-0.5 block truncate hover:text-[#FF6B00] transition-colors"
                    >
                      {line.name}
                    </Link>
                    <p className="text-[#6B6B80] font-inter text-sm mb-1">{line.variantLabel}</p>
                    <p className="text-[#FFB800] font-bebas text-xl mb-2">
                      {formatPrice(line.priceCents)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div role="group" aria-label={`Quantity for ${line.name}, ${line.variantLabel}`}>
                        <button
                          onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                          aria-label="Decrease quantity"
                          disabled={line.quantity <= 1}
                          className="w-8 h-8 bg-[#2A2A3A] text-[#F0F0F0] rounded hover:bg-[#FF6B00] transition-colors disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="text-[#F0F0F0] font-inter w-8 inline-block text-center" aria-live="polite">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                          aria-label="Increase quantity"
                          disabled={line.quantity >= line.maxQuantity}
                          title={
                            line.quantity >= line.maxQuantity ? 'No more stock available' : undefined
                          }
                          className="w-8 h-8 bg-[#2A2A3A] text-[#F0F0F0] rounded hover:bg-[#FF6B00] transition-colors disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeLine(line.variantId)}
                        aria-label={`Remove ${line.name}, ${line.variantLabel} from cart`}
                        className="ml-auto text-[#CC0000] hover:text-[#FF6B00] transition-colors p-1"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 18 L18 6 M6 6 L18 18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && (
          <div className="p-6 border-t border-[#2A2A3A]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#6B6B80] font-inter">Subtotal</span>
              <span className="text-[#FFB800] font-bebas text-2xl">
                {formatPrice(subtotalCents)}
              </span>
            </div>
            <button
              disabled
              aria-disabled="true"
              title="Checkout arrives with Phase 6"
              className="w-full py-4 bg-[#16161F] text-[#6B6B80] font-cinzel font-bold cursor-not-allowed rounded-lg border border-[#2A2A3A]"
            >
              CHECKOUT — COMING SOON
            </button>
            <p className="text-center text-[#6B6B80] text-sm font-inter mt-4">
              Free shipping on orders over $50
            </p>
          </div>
        )}
      </div>
    </>
  );
}
