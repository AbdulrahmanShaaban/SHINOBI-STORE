'use client';

/**
 * Community page — public reviews/feedback wall.
 * Fetches real approved reviews from the API and lets signed-in users
 * submit new reviews.
 */

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useUser } from '@/lib/user-context';
import {
  getRecentReviews,
  getProductList,
  submitReview,
  type RecentReview,
} from '@/lib/api';

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

export default function CommunityPage() {
  const { user, loading: userLoading } = useUser();

  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'all' | '5' | '4' | '3'>('all');

  // Review form state
  const [products, setProducts] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [reviewsData, productsData] = await Promise.all([
          getRecentReviews({ limit: 50 }),
          getProductList({ limit: 50 }),
        ]);
        if (!alive) return;
        setReviews(reviewsData.items);
        setProducts(productsData.items);
      } catch {
        if (!alive) return;
        setError('Failed to load reviews. Please try again later.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = reviews.filter(
    (r) => filter === 'all' || String(r.rating) === filter,
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !selectedSlug) return;
    setBusy(true);
    setFeedback(null);
    try {
      await submitReview(selectedSlug, {
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      });
      setFeedback({
        kind: 'ok',
        message: 'Review submitted — it will appear once a moderator approves it.',
      });
      setTitle('');
      setBody('');
      setRating(5);
    } catch (err) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not submit the review.',
      });
    } finally {
      setBusy(false);
    }
  };

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
      {loading ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#2A2A3A] bg-[#12121A] p-6 animate-pulse flex flex-col gap-3"
            >
              <div className="h-5 w-24 bg-[#2A2A3A] rounded" />
              <div className="h-4 w-32 bg-[#2A2A3A] rounded" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-full bg-[#2A2A3A] rounded" />
                <div className="h-3 w-3/4 bg-[#2A2A3A] rounded" />
              </div>
              <div className="h-3 w-20 bg-[#2A2A3A] rounded" />
            </div>
          ))}
        </section>
      ) : error ? (
        <section className="rounded-xl border border-[#CC0000]/40 bg-[#CC0000]/10 p-8 text-center">
          <p className="font-inter text-sm text-[#F0F0F0]">{error}</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="rounded-xl border border-[#2A2A3A] bg-[#12121A] p-8 text-center">
          <p className="font-inter text-sm text-[#6B6B80]">
            {filter === 'all'
              ? 'No reviews yet. Be the first to share your experience!'
              : `No ${filter}-star reviews found.`}
          </p>
        </section>
      ) : (
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
      )}

      {/* Write a Review */}
      <section className="mt-16 rounded-xl border border-[#2A2A3A] bg-[#16161F] p-6 max-w-[560px] mx-auto">
        <h2 className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC] mb-4">
          Write a Review
        </h2>

        {userLoading ? null : !user ? (
          <div className="text-sm text-[#B9B9C9]">
            <p>
              Only signed-in shinobi can review.{' '}
              <Link
                href="/account/login?next=/community"
                className="text-[#FF6B00] underline underline-offset-4"
              >
                Sign in
              </Link>{' '}
              to share your experience.
            </p>
          </div>
        ) : feedback?.kind === 'ok' ? (
          <p
            role="status"
            aria-live="polite"
            className="rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-3 text-sm text-[#4ADE80]"
          >
            {feedback.message}
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="community-product" className="block font-inter text-xs text-[#6B6B80] mb-1">
                Product
              </label>
              <select
                id="community-product"
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                required
                className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none cursor-pointer"
              >
                <option value="" disabled>
                  Select a product…
                </option>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="community-rating" className="block font-inter text-xs text-[#6B6B80] mb-1">
                Rating
              </label>
              <select
                id="community-rating"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {'★'.repeat(value)} ({value})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="community-title" className="block font-inter text-xs text-[#6B6B80] mb-1">
                Title <span className="text-[#3A3A4A]">(optional)</span>
              </label>
              <input
                id="community-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={140}
                className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="community-body" className="block font-inter text-xs text-[#6B6B80] mb-1">
                Your review
              </label>
              <textarea
                id="community-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={2000}
                required
                minLength={3}
                aria-describedby="community-body-count"
                className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
              />
              <p id="community-body-count" className="mt-1 font-inter text-xs text-[#6B6B80]">
                {body.length}/2000
              </p>
            </div>
            {feedback?.kind === 'error' ? (
              <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-3 py-2 text-sm text-[#F0F0F0]">
                {feedback.message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy || !selectedSlug || body.trim().length < 3}
              className="min-h-[44px] w-full rounded-lg bg-[#FF6B00] px-4 font-cinzel text-xs font-bold uppercase tracking-wider text-[#160B02] transition-colors hover:bg-[#FF8433] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'SUBMITTING…' : 'SUBMIT REVIEW'}
            </button>
            <p className="font-inter text-xs text-[#6B6B80]">
              Reviews are moderated before they appear publicly.
            </p>
          </form>
        )}
      </section>

      {/* CTA */}
      <section className="mt-12 text-center">
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
