'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ProductDetail } from '@/lib/api';
import { splitChars } from '@/lib/split-chars';
import ProductGallery from './ProductGallery';
import AddToCartPanel from './AddToCartPanel';
import RelatedProducts from './RelatedProducts';

export interface RelatedProductsData {
  items: {
    id: string;
    slug: string;
    name: string;
    primaryImageUrl: string | null;
    priceFromCents: number | null;
    compareAtPriceCents?: number | null;
  }[];
}

interface ProductDetailViewProps {
  product: ProductDetail;
  related: RelatedProductsData;
}

/**
 * Client orchestrator for the product page.
 * Entrance sequence (§19.3 fallback timeline — also used on direct load):
 * gallery → title chars → info blocks stagger → price/CTA settle.
 *
 * Content is never hidden in CSS: GSAP sets initial states at mount
 * (pre-paint), so without JS or with reduced motion everything is visible.
 */
export default function ProductDetailView({ product, related }: ProductDetailViewProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        // Final states immediately; nothing animates.
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.fromTo(
          '[data-animate="gallery"]',
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.7 },
        )
          .fromTo(
            '[data-char]',
            { opacity: 0, yPercent: 110 },
            { opacity: 1, yPercent: 0, duration: 0.5, stagger: 0.03 },
            0.15,
          )
          .fromTo(
            '[data-animate^="info-"]',
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 },
            0.3,
          )
          .fromTo(
            '[data-animate="cta"]',
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 0.6 },
            0.55,
          );
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const titleChars = splitChars(product.name.toUpperCase());

  return (
    <div ref={root}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" data-animate="info-0">
        <ol className="flex flex-wrap items-center gap-2 font-inter text-sm text-[#6B6B80]">
          <li>
            <Link href="/" className="hover:text-[#FF6B00] transition-colors">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>{product.category.name}</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[#F0F0F0]">{product.name}</li>
        </ol>
      </nav>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-14 xl:gap-20 mt-6 lg:mt-10">
        <div data-animate="gallery" className="min-w-0">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          <header>
            <p
              data-animate="info-1"
              className="font-inter text-xs uppercase tracking-[0.25em] text-[#FF6B00] mb-2"
            >
              {product.anime.name}
              {product.character ? ` · ${product.character.name}` : ''}
            </p>
            <h1 className="font-anton uppercase leading-none text-4xl sm:text-5xl xl:text-6xl break-words">
              {titleChars.map(({ char, key }) => (
                <span key={key} data-char className="inline-block will-change-transform">
                  {char}
                </span>
              ))}
            </h1>
            <div
              data-animate="info-2"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3"
            >
              <span className="font-bebas text-lg text-[#FFB800]" aria-hidden="true">
                {'★'.repeat(Math.round(product.ratingAvg))}
              </span>
              <span className="font-inter text-sm text-[#6B6B80]">
                {product.ratingAvg.toFixed(1)} · {product.reviewCount}{' '}
                {product.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
              <span className="font-inter text-sm text-[#6B6B80]">
                {product.tagSlugs.map((t) => t.name).join(' · ')}
              </span>
            </div>
          </header>

          <p
            data-animate="info-3"
            className="font-inter text-base leading-relaxed text-[#B9B9C9] whitespace-pre-line"
          >
            {product.description}
          </p>

          <div data-animate="cta">
            <AddToCartPanel product={product} />
          </div>
        </div>
      </div>

      {related.items.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-20 lg:mt-28">
          <h2
            id="related-heading"
            className="font-anton uppercase text-2xl sm:text-3xl tracking-wide mb-6"
          >
            Complete the fit
          </h2>
          <RelatedProducts items={related.items} />
        </section>
      )}
    </div>
  );
}
