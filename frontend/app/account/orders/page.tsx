'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/lib/user-context';
import { formatPrice } from '@/lib/money';

interface OrderRow {
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  items: { productName: string; variantName: string; quantity: number }[];
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'text-[#7CFC00]',
  processing: 'text-[#FFB800]',
  shipped: 'text-[#FF6B00]',
  delivered: 'text-[#F0F0F0]',
  cancelled: 'text-[#CC0000]',
  refunded: 'text-[#CC0000]',
  pending_payment: 'text-[#FFB800]',
};

export default function OrdersPage() {
  const { user, loading } = useUser();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1/orders/mine/list`,
      { credentials: 'include', headers: { 'x-csrf-token': '1' } },
    )
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [user]);

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-[#6B6B80] font-cinzel">Sign in to view your orders.</p>
        <Link href="/account/login?next=/account/orders" className="inline-block mt-4 text-[#FF6B00] underline underline-offset-4 text-sm">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-bebas text-5xl tracking-wide text-[#F0F0F0] mb-8">MY ORDERS</h1>
      {orders === null ? (
        <p className="text-[#6B6B80]" role="status" aria-live="polite">
          Loading…
        </p>
      ) : orders.length === 0 ? (
        <p className="text-[#B8B8CC]">
          No orders yet.{' '}
          <Link href="/products" className="text-[#FF6B00] underline underline-offset-4">
            Start shopping
          </Link>
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.orderNumber}>
              <Link
                href={`/account/orders/${o.orderNumber}`}
                className="block rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 hover:border-[#FF6B00]/60 transition-colors"
              >
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-sm text-[#FF6B00]">{o.orderNumber}</span>
                  <span className={`font-bebas text-lg ${STATUS_COLOR[o.status] ?? 'text-[#B8B8CC]'}`}>
                    {o.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-[#B8B8CC] mt-1 truncate">
                  {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                </p>
                <p className="font-bebas text-xl text-[#FFB800] mt-1">{formatPrice(o.totalCents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
