'use client';

/**
 * Product reviews section (§10.3). Plain request/response — deliberately NO
 * realtime: a newly submitted review enters the `pending` moderation queue
 * and becomes publicly visible only after staff approval, on the next
 * load/refetch. Logged-out visitors see the list plus a sign-in prompt, not a
 * broken form.
 */

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { submitReview, type ProductReview, type ProductReviewsPayload } from '@/lib/api';
import { useUser } from '@/lib/user-context';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="font-bebas text-lg text-[#FFB800]" aria-hidden="true">
      {'★'.repeat(rating)}
      <span className="text-[#3A3A4A]">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ReviewsSection({
  slug,
  productName,
  initial,
}: {
  slug: string;
  productName: string;
  initial: ProductReviewsPayload;
}) {
  const { user, loading } = useUser();
  const [reviews] = useState<ProductReview[]>(initial.items);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await submitReview(slug, { rating, title: title.trim() || undefined, body: body.trim() });
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
    <section aria-labelledby="reviews-heading" className="mt-20 lg:mt-28">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-6">
        <h2 id="reviews-heading" className="font-anton uppercase text-2xl sm:text-3xl tracking-wide">
          Reviews
        </h2>
        {initial.total > 0 && (
          <p className="font-inter text-sm text-[#6B6B80]">
            <span className="font-bebas text-lg text-[#FFB800]" aria-hidden="true">
              {'★'.repeat(Math.round(initial.average ?? 0))}
            </span>{' '}
            {initial.average?.toFixed(1)} · {initial.total}{' '}
            {initial.total === 1 ? 'approved review' : 'approved reviews'}
          </p>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* List */}
        <div className="space-y-5">
          {reviews.length === 0 ? (
            <p className="text-sm text-[#6B6B80]">
              No approved reviews yet{user ? ' — yours could be the first.' : '.'}
            </p>
          ) : (
            <ul className="space-y-5">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-xl border border-[#2A2A3A] bg-[#12121A] p-5"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={review.rating} />
                    {review.title ? (
                      <p className="font-cinzel text-sm font-bold text-[#F0F0F0]">{review.title}</p>
                    ) : null}
                    <span className="ml-auto font-inter text-xs text-[#6B6B80]">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 font-inter text-sm leading-relaxed text-[#B9B9C9]">
                    {review.body}
                  </p>
                  <p className="mt-2 font-inter text-xs text-[#6B6B80]">— {review.author}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submission */}
        <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-6 h-fit">
          <h3 className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC] mb-4">
            Write a review
          </h3>

          {loading ? null : !user ? (
            <div className="text-sm text-[#B9B9C9]">
              <p>
                Only signed-in shinobi can review.{' '}
                <Link
                  href={`/account/login?next=/products/${encodeURIComponent(slug)}`}
                  className="text-[#FF6B00] underline underline-offset-4"
                >
                  Sign in
                </Link>{' '}
                to review {productName}.
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
                <label htmlFor="review-rating" className="block font-inter text-xs text-[#6B6B80] mb-1">
                  Rating
                </label>
                <select
                  id="review-rating"
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
                <label htmlFor="review-title" className="block font-inter text-xs text-[#6B6B80] mb-1">
                  Title <span className="text-[#3A3A4A]">(optional)</span>
                </label>
                <input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={140}
                  className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="review-body" className="block font-inter text-xs text-[#6B6B80] mb-1">
                  Your review
                </label>
                <textarea
                  id="review-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  required
                  minLength={3}
                  aria-describedby="review-body-count"
                  className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
                />
                <p id="review-body-count" className="mt-1 font-inter text-xs text-[#6B6B80]">
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
                disabled={busy || body.trim().length < 3}
                className="min-h-[44px] w-full rounded-lg bg-[#FF6B00] px-4 font-cinzel text-xs font-bold uppercase tracking-wider text-[#160B02] transition-colors hover:bg-[#FF8433] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'SUBMITTING…' : 'SUBMIT REVIEW'}
              </button>
              <p className="font-inter text-xs text-[#6B6B80]">
                Reviews are moderated before they appear publicly.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
