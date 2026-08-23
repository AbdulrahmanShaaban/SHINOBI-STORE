'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * §14.2: this page NEVER trusts its own existence as proof of payment —
 * it polls GET /orders/status/:orderNumber until the DB says confirmed,
 * failed or the reservation expires.
 */
function ReturnInner() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order') ?? '';
  const [status, setStatus] = useState<'polling' | 'confirmed' | 'pending_payment' | 'cancelled' | 'unknown'>('polling');
  const attempts = useRef(0);

  useEffect(() => {
    if (!orderNumber) {
      setStatus('unknown');
      return;
    }
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1/orders/status/${encodeURIComponent(orderNumber)}`,
        );
        if (res.ok) {
          const body = (await res.json()) as { status: string };
          if (!alive) return;
          if (body.status === 'confirmed') return setStatus('confirmed');
          if (body.status === 'pending_payment') setStatus('pending_payment');
          else setStatus('cancelled');
          return; // terminal states stop polling
        }
      } catch {
        // network blip → keep polling
      }
      attempts.current += 1;
      if (attempts.current < 30 && alive) setTimeout(poll, 2_000);
      else if (alive) setStatus('unknown');
    };
    void poll();
    return () => {
      alive = false;
    };
  }, [orderNumber]);

  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      {status === 'confirmed' ? (
        <>
          <p aria-hidden="true" className="font-bebas text-7xl text-[#FFB800]">
            忍
          </p>
          <h1 className="font-bebas text-4xl text-[#F0F0F0] mt-3">ORDER CONFIRMED</h1>
          <p className="text-sm text-[#B8B8CC] mt-2">
            Order <span className="font-mono text-[#FF6B00]">{orderNumber}</span> is locked in. A confirmation email is on its way.
          </p>
          <Link href="/products" className="inline-block mt-8 rounded-lg border border-[#FF6B00]/60 bg-[#FF6B00]/10 px-6 py-2.5 font-cinzel font-bold text-sm text-[#FF6B00] hover:bg-[#FF6B00]/20">
            CONTINUE SHOPPING
          </Link>
        </>
      ) : status === 'pending_payment' ? (
        <>
          <h1 className="font-bebas text-4xl text-[#F0F0F0]">FINALIZING…</h1>
          <p className="text-sm text-[#B8B8CC] mt-2" role="status" aria-live="polite">
            Your payment is processing. This page updates automatically.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-bebas text-4xl text-[#F0F0F0]">
            {status === 'cancelled' ? 'ORDER CANCELLED' : 'ORDER NOT FOUND'}
          </h1>
          <p className="text-sm text-[#B8B8CC] mt-2">
            {orderNumber ? `No confirmed order for ${orderNumber}.` : 'No order number supplied.'}
          </p>
          <Link href="/products" className="inline-block mt-8 rounded-lg border border-[#FF6B00]/60 px-6 py-2.5 font-cinzel font-bold text-sm text-[#FF6B00]">
            BACK TO THE ARMORY
          </Link>
        </>
      )}
    </main>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnInner />
    </Suspense>
  );
}
