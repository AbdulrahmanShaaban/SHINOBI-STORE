'use client';

/**
 * Community page — public reviews/feedback wall.
 * Displays approved reviews from all products in a feed layout.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CommunityReview {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
  productSlug: string;
  productName: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="font-bebas text-lg text-[#FFB800]" aria-hidden="true">
      {'★'.repeat(rating)}
      <span className="text-[#3A3A4A]">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const MOCK_REVIEWS: CommunityReview[] = [
  {
    id: '1',
    author: 'NarutoFan99',
    rating: 5,
    title: 'Insane Quality',
    body: 'The Kakashi hoodie is absolutely fire. The print quality is next level and the material feels premium. Worth every penny.',
    createdAt: '2026-08-20T10:00:00Z',
    productSlug: 'hataki-kakashi',
    productName: 'Hataki Kakashi',
  },
  {
    id: '2',
    author: 'AnimeCollector',
    rating: 5,
    title: 'Best Store Ever',
    body: 'Finally a store that gets anime merch right. The Pain tee fits perfectly and the design is clean. Fast shipping too!',
    createdAt: '2026-08-18T14:30:00Z',
    productSlug: 'pain-splash-art',
    productName: 'Pain Splash Art',
  },
  {
    id: '3',
    author: 'SasukeSimp',
    rating: 4,
    title: 'Great Product',
    body: 'Love the Obito hoodie design. Took a star off because shipping took a bit longer than expected, but the product itself is perfect.',
    createdAt: '2026-08-15T09:15:00Z',
    productSlug: 'obito-uchiha',
    productName: 'Obito Uchiha',
  },
  {
    id: '4',
    author: 'ShinobiWarrior',
    rating: 5,
    title: '🔥🔥🔥',
    body: 'This is hands down the best anime merch store online. The attention to detail on every product is insane.',
    createdAt: '2026-08-12T16:45:00Z',
    productSlug: 'hataki-kakashi',
    productName: 'Hataki Kakashi',
  },
];

export default function CommunityPage() {
  const [reviews] = useState<CommunityReview[]>(MOCK_REVIEWS);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3'>('all');

  const filtered = reviews.filter(
    (r) => filter === 'all' || String(r.rating) === filter,
  );

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-12 lg:pt-20 pb-24">
      {/* Hero */}
      <section className="mb-12 lg:mb-16">
        <h1 className="font-anton text-[clamp(2.5rem,6vw,5rem)] uppercase tracking-wide text-[#F0F0F0] leading-[0.95] mb-4">
          COMMUNITY
        </h1>
        <p className="font-inter text-[#6B6B80] text-lg max-w-[600px]">
          Real reviews from real shinobi. See what the community has to say about their
          gear.
        </p>
        <div className="w-20 h-1 bg-[#FF6B00] rounded-full mt-6" />
      </section>

      {/* Filters */}
      <section className="mb-8 flex flex-wrap items-center gap-3">
        {(['all', '5', '4', '3'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-inter text-sm transition-colors ${
              filter === f
                ? 'bg-[#FF6B00] text-[#160B02] font-bold'
                : 'border border-[#2A2A3A] text-[#6B6B80] hover:border-[#FF6B00]/60 hover:text-[#F0F0F0]'
            }`}
          >
            {f === 'all' ? 'ALL REVIEWS' : '★'.repeat(Number(f))}
          </button>
        ))}
      </section>

      {/* Reviews Grid */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-[#2A2A3A] bg-[#12121A] p-6 hover:border-[#FF6B00]/30 transition-colors flex flex-col"
          >
            <div className="flex items-center gap-3 mb-3">
              <Stars rating={review.rating} />
              <span className="font-inter text-xs text-[#6B6B80]">
                {formatDate(review.createdAt)}
              </span>
            </div>
            {review.title && (
              <h3 className="font-cinzel text-sm font-bold text-[#F0F0F0] mb-2">
                {review.title}
              </h3>
            )}
            <p className="font-inter text-sm text-[#B9B9C9] leading-relaxed flex-1">
              {review.body}
            </p>
            <div className="mt-4 pt-4 border-t border-[#2A2A3A] flex items-center justify-between">
              <span className="font-inter text-xs text-[#6B6B80]">— {review.author}</span>
              <Link
                href={`/products/${review.productSlug}`}
                className="font-inter text-xs text-[#FF6B00] hover:text-[#FF8433] transition-colors"
              >
                {review.productName} →
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <p className="font-inter text-[#6B6B80] mb-4">
          Bought something? Share your experience with the community.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-lg bg-[#CC0000] px-6 py-3 font-cinzel font-bold tracking-wider text-sm text-[#F0F0F0] hover:bg-[#FF6B00] transition-colors"
        >
          SHOP NOW
        </Link>
      </section>
    </main>
  );
}
