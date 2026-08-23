'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type DashboardData } from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import StatTile from '@/components/admin/StatTile';
import StatusBadge from '@/components/admin/StatusBadge';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import { formatDateTime } from '@/components/admin/format';

const td = 'px-4 py-3 align-middle text-[#B8B8CC]';

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    adminApi
      .getDashboard()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load the dashboard.');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div>
        <h1 className="mb-8 font-bebas text-5xl tracking-wide text-[#F0F0F0]">DASHBOARD</h1>
        <p role="alert" className="rounded-lg border border-[#CC0000]/50 bg-[#CC0000]/10 px-4 py-2 text-sm text-[#F0F0F0]">
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-[#6B6B80]" role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-8 font-bebas text-5xl tracking-wide text-[#F0F0F0]">DASHBOARD</h1>

      <section aria-labelledby="revenue-heading" className="mb-8">
        <h2 id="revenue-heading" className="sr-only">
          Revenue
        </h2>
        <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-6">
          <p className="font-cinzel text-xs uppercase tracking-wider text-[#6B6B80]">REVENUE</p>
          <p className="mt-1 font-bebas text-5xl text-[#FFB800]">{formatPrice(data.revenueCents)}</p>
        </div>
      </section>

      <section aria-labelledby="orders-status-heading" className="mb-8">
        <h2 id="orders-status-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          ORDERS BY STATUS
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {Object.entries(data.ordersByStatus).map(([status, count]) => (
            <StatTile key={status} label={status.replace(/_/g, ' ')} value={count} />
          ))}
        </div>
      </section>

      <section aria-labelledby="low-stock-heading" className="mb-8">
        <h2 id="low-stock-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          LOW STOCK
        </h2>
        {data.lowStock.length === 0 ? (
          <p className="text-sm text-[#6B6B80]">No low-stock variants.</p>
        ) : (
          <AdminTable headers={['SKU', 'PRODUCT', 'ON HAND', 'RESERVED']}>
            {data.lowStock.map((v) => (
              <TableRow key={v.variantId}>
                <td className={`${td} font-mono text-xs text-[#F0F0F0]`}>{v.sku}</td>
                <td className={td}>{v.productName}</td>
                <td className={td}>{v.stockOnHand}</td>
                <td className={`${td} ${v.reserved >= v.stockOnHand ? 'font-bold text-[#CC0000]' : ''}`}>
                  {v.reserved}
                </td>
              </TableRow>
            ))}
          </AdminTable>
        )}
      </section>

      <section aria-labelledby="recent-orders-heading">
        <h2 id="recent-orders-heading" className="mb-3 font-cinzel text-sm font-bold tracking-wider text-[#B8B8CC]">
          RECENT ORDERS
        </h2>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-[#6B6B80]">No orders yet.</p>
        ) : (
          <AdminTable headers={['ORDER', 'STATUS', 'TOTAL', 'PLACED', 'CONTACT']}>
            {data.recentOrders.map((o) => (
              <TableRow key={o.orderNumber}>
                <td className={td}>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                    className="font-mono text-xs text-[#FF6B00] hover:underline underline-offset-4"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className={td}>
                  <StatusBadge status={o.status} />
                </td>
                <td className={`${td} text-[#FFB800]`}>{formatPrice(o.totalCents)}</td>
                <td className={td}>{formatDateTime(o.createdAt)}</td>
                <td className={`${td} truncate`}>{o.contactEmail}</td>
              </TableRow>
            ))}
          </AdminTable>
        )}
      </section>
    </div>
  );
}
