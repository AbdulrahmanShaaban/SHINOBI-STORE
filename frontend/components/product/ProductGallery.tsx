'use client';

import { useState } from 'react';
import type { ProductImage } from '@/lib/api';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

/**
 * Main image + thumbnail rail. Keyboard accessible: thumbs are real buttons
 * announcing selection state. Zoom-lite scales the main image under the
 * cursor on fine-pointer devices; disabled for touch and reduced motion.
 */
export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zooming, setZooming] = useState(false);
  const active = images[activeIndex] ?? null;

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
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          if (!window.matchMedia('(pointer: fine)').matches) return;
          setZooming(true);
          const target = e.currentTarget.firstElementChild as HTMLElement;
          const rect = e.currentTarget.getBoundingClientRect();
          target.style.transformOrigin = `${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`;
        }}
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
      </div>
    </div>
  );
}
