'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import ProductCard from './ProductCard';

/**
 * Horizontal rail of related products (same anime / category).
 * Cards are real links — every product surface routes to a shareable URL.
 */
export default function RelatedProducts({
  items,
}: {
  items: {
    id: string;
    slug: string;
    name: string;
    primaryImageUrl: string | null;
    priceFromCents: number | null;
    compareAtPriceCents?: number | null;
  }[];
}) {
  const track = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      if (!track.current) return;
      const cards = track.current.querySelectorAll('[data-rail-card]');
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          cards,
          { opacity: 0, x: 40 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: { trigger: track.current!, start: 'top 90%', once: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: track },
  );

  return (
    <ul
      ref={track}
      className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <li key={item.id} data-rail-card className="shrink-0 snap-start">
          <ProductCard product={item} className="w-[220px] sm:w-[240px]" />
        </li>
      ))}
    </ul>
  );
}
