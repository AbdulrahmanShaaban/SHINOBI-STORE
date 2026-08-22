'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import ProductCard from '@/components/product/ProductCard';
import type { ProductListItem } from '@/lib/api';

/** Shop grid with a reduced-motion-gated stagger entrance. */
export default function ProductGrid({ items }: { items: ProductListItem[] }) {
  const grid = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      if (!grid.current) return;
      const cards = grid.current.querySelectorAll('[data-card]');
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power2.out',
            clearProps: 'transform',
          },
        );
      });
      return () => mm.revert();
    },
    { scope: grid },
  );

  return (
    <ul ref={grid} className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <li key={item.id} data-card>
          <ProductCard product={item} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
