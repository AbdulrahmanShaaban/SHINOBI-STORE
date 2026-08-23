'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { formatPrice } from '@/lib/money';

/**
 * §14.2 client entry. The button disables on submit and carries an
 * Idempotency-Key so double-clicks can never create two orders; the server
 * re-prices everything anyway.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const clearMerged = useCartStore((s) => s.removeLine);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState({ fullName: '', line1: '', city: '', postalCode: '', country: 'US' });
  const [couponCode, setCouponCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One key per checkout attempt (kept across retries of THIS submission).
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const subtotalCents = lines.reduce(
    (sum, l) => sum + (l.unavailable ? 0 : l.priceCents * l.quantity),
    0,
  );
  const shippingCents = subtotalCents === 0 || subtotalCents >= 5_000 ? 0 : 499;
  const totalCents = subtotalCents + shippingCents;

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1/orders`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json', 'x-csrf-token': '1' },
          body: JSON.stringify({
            lines: lines
              .filter((l) => !l.unavailable)
              .map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
            contactEmail: email,
            shippingAddress: address,
            couponCode: couponCode || undefined,
            idempotencyKey,
          }),
        },
      );
      const body = (await res.json().catch(() => null)) as {
        orderNumber?: string;
        message?: string;
        code?: string;
      } | null;
      if (!res.ok || !body?.orderNumber) {
        setError(body?.message ?? 'Could not place the order.');
        setBusy(false);
        return;
      }
      // Order accepted server-side; local guest lines are done.
      for (const l of lines) clearMerged(l.variantId);
      router.push(`/checkout/return?order=${encodeURIComponent(body.orderNumber)}`);
    } catch {
      setError('Network error while placing the order.');
      setBusy(false);
    }
  };

  if (lines.length === 0 && !busy) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-bebas text-4xl text-[#F0F0F0]">NOTHING TO CHECK OUT</h1>
        <p className="mt-2 text-sm text-[#B8B8CC]">
          Your cart is empty.{' '}
          <Link href="/products" className="text-[#FF6B00] underline underline-offset-4">
            Browse the armory
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="font-bebas text-5xl tracking-wide text-[#F0F0F0] mb-8">CHECKOUT</h1>

      <form onSubmit={placeOrder} className="grid lg:grid-cols-[1fr_360px] gap-8">
        <section className="space-y-4">
          <h2 className="font-cinzel font-bold text-[#B8B8CC] text-sm">CONTACT</h2>
          <input
            type="email"
            required
            placeholder="Email for order updates"
            aria-label="Contact email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none"
          />

          <h2 className="font-cinzel font-bold text-[#B8B8CC] text-sm pt-2">SHIPPING ADDRESS</h2>
          {(
            [
              ['fullName', 'Full name', false],
              ['line1', 'Address line', false],
              ['city', 'City', false],
              ['postalCode', 'Postal code', false],
              ['country', 'Country (US, DE…)', false],
            ] as const
          ).map(([key, placeholder]) => (
            <input
              key={key}
              required
              placeholder={placeholder}
              aria-label={placeholder}
              value={address[key]}
              onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
              className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none"
            />
          ))}

          <input
            placeholder="Coupon code (optional)"
            aria-label="Coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="w-full bg-[#12121A] border border-dashed border-[#2A2A3A] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none"
          />
        </section>

        <aside className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-6 h-fit" aria-label="Order summary">
          <h2 className="font-cinzel font-bold text-[#F0F0F0] mb-4">SUMMARY</h2>
          <ul className="space-y-2 text-sm text-[#B8B8CC] mb-4">
            {lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-2">
                <span className={l.unavailable ? 'line-through' : ''}>
                  {l.name} ×{l.unavailable ? l.quantity : l.quantity}
                </span>
                <span>{formatPrice(l.priceCents * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="text-sm space-y-1 border-t border-[#2A2A3A] pt-3">
            <div className="flex justify-between">
              <dt className="text-[#6B6B80]">Subtotal</dt>
              <dd>{formatPrice(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6B6B80]">Shipping</dt>
              <dd>{shippingCents === 0 ? 'Free' : formatPrice(shippingCents)}</dd>
            </div>
            <div className="flex justify-between font-bebas text-2xl text-[#FFB800] pt-2">
              <dt>Total</dt>
              <dd>{formatPrice(totalCents)}</dd>
            </div>
          </dl>

          {error ? (
            <p role="alert" className="mt-4 rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full py-4 rounded-lg bg-[#CC0000] hover:bg-[#FF6B00] transition-colors font-cinzel font-bold tracking-wider text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'PLACING ORDER…' : 'PLACE ORDER'}
          </button>
          <p className="mt-2 text-xs text-[#6B6B80] text-center">
            Payment step arrives with Stripe keys — your order is already reserved server-side.
          </p>
        </aside>
      </form>
    </main>
  );
}
