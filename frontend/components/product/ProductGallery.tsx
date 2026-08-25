'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProductImage } from '@/lib/api';
import { acquireScrollLock, releaseLock } from '@/lib/scroll-lock';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

/** Percentage transform-origin under the cursor, relative to an element's box. */
function pointerOrigin(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): string {
  return `${((clientX - rect.left) / rect.width) * 100}% ${((clientY - rect.top) / rect.height) * 100}%`;
}

/** Hover zoom is a desktop nicety: skip it for touch input and reduced motion. */
function hoverZoomEnabled(): boolean {
  return (
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    window.matchMedia('(pointer: fine)').matches
  );
}

/**
 * Main image + thumbnail rail. Keyboard accessible: thumbs are real buttons
 * announcing selection state. Zoom-lite scales the main image under the
 * cursor on fine-pointer devices; touch devices get a button that opens a
 * pannable fullscreen zoom of the current image instead.
 */
export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const active = images[activeIndex] ?? null;

  // Touch fallback detection: coarse pointers get the lightbox zoom button.
  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const sync = () => setIsTouch(coarsePointer.matches);
    sync();
    coarsePointer.addEventListener('change', sync);
    return () => coarsePointer.removeEventListener('change', sync);
  }, []);

  // Zoomed view focus management + shared body scroll lock (same pattern as Cart).
  useEffect(() => {
    if (!lightboxOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    acquireScrollLock();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'Tab' && dialogRef.current) {
        // Minimal focus trap.
        const focusable =
          dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
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
      releaseLock();
      previouslyFocused?.focus?.();
    };
  }, [lightboxOpen]);

  if (!active) return null;

  const select = (index: number) => {
    setActiveIndex(index);
    setZooming(false);
  };

  const onThumbKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      select((index + 1) % images.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      select((index - 1 + images.length) % images.length);
    }
  };

  const trackPointerOrigin = (e: React.MouseEvent<HTMLElement>) => {
    if (!hoverZoomEnabled()) return;
    const target = e.currentTarget.firstElementChild as HTMLElement;
    const rect = e.currentTarget.getBoundingClientRect();
    target.style.transformOrigin = pointerOrigin(rect, e.clientX, e.clientY);
  };

  return (
    <div className="gallery flex flex-col-reverse md:flex-row gap-3 md:gap-4">
      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          role="listbox"
          aria-label={`${productName} images`}
          aria-orientation="horizontal"
          className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              role="option"
              aria-selected={index === activeIndex}
              aria-label={`View image ${index + 1} of ${images.length}${image.altText ? `: ${image.altText}` : ''}`}
              onClick={() => select(index)}
              onKeyDown={(e) => onThumbKeyDown(e, index)}
              className={`relative h-[72px] w-[72px] md:h-20 md:w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-colors bg-[#16161F] ${
                index === activeIndex
                  ? 'border-[#FF6B00]'
                  : 'border-[#2A2A3A] hover:border-[#6B6B80] focus-visible:border-[#FF6B00]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div
        className="relative flex-1 aspect-square max-h-[70vh] w-full rounded-xl overflow-hidden bg-[#12121A] border border-[#2A2A3A]"
        onMouseEnter={(e) => {
          if (!hoverZoomEnabled()) return;
          setZooming(true);
          trackPointerOrigin(e);
        }}
        onMouseMove={trackPointerOrigin}
        onMouseLeave={() => setZooming(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active.id}
          src={active.url}
          alt={active.altText || productName}
          fetchPriority="high"
          className={`h-full w-full object-contain p-4 transition-transform duration-500 ease-out ${
            zooming ? 'scale-[1.6]' : 'scale-100'
          }`}
        />

        {/* Touch fallback: opens a pannable fullscreen zoom (coarse pointers only). */}
        {isTouch && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Zoom ${active.altText || productName}`}
            className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#2A2A3A] bg-[#16161F]/90 text-[#F0F0F0] hover:border-[#FF6B00] active:bg-[#FF6B00]/20 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Fullscreen pannable zoom (touch fallback). */}
      {lightboxOpen && active && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Zoomed image — ${active.altText || productName}`}
          className="fixed inset-0 z-[60] flex flex-col bg-[#0A0A0F]/95"
        >
          <div className="flex items-center justify-end p-3">
            <button
              ref={closeRef}
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close zoomed image"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2A2A3A] bg-[#16161F]/90 text-[#F0F0F0] hover:border-[#FF6B00] transition-colors"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18 L18 6 M6 6 L18 18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Pan/scroll area: image renders larger than the viewport so users can drag around it. */}
          <div className="flex-1 overflow-auto overscroll-contain">
            <div className="grid min-h-full w-max min-w-full place-items-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={active.altText || productName}
                draggable={false}
                className="max-w-none w-[200vmin] select-none rounded-lg bg-[#16161F]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
