'use client';

import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { formatPrice } from '@/lib/money';
import StatTile from '@/components/admin/StatTile';
import StatusBadge from '@/components/admin/StatusBadge';
import AdminTable, { TableRow } from '@/components/admin/AdminTable';
import EmptyState from '@/components/admin/EmptyState';
import ErrorState from '@/components/admin/ErrorState';
import SectionCard from '@/components/admin/SectionCard';
import { useAdminList } from '@/components/admin/use-admin-list';
import { formatDateTime } from '@/components/admin/format';
import { toneForStatus, type StatusTone } from '@/components/admin/StatusBadge';
import { tdClass } from '@/components/admin/ui';

function lowStockSeverity(stockOnHand: number, reserved: number) {
  if (stockOnHand === 0 || reserved > stockOnHand) {
    return { label: 'CRITICAL', chip: 'text-[#FF6B6B]', row: 'bg-[#CC0000]/[0.05]' };
  }
  if (stockOnHand <= 5) {
    return { label: 'LOW', chip: 'text-[#FFB800]', row: 'bg-[#FFB800]/[0.04]' };
  }
  return { label: 'WATCH', chip: 'text-[#9B9BB0]', row: '' };
}

const STATUS_ACCENT: Partial<Record<StatusTone, 'money' | 'accent' | 'danger' | 'muted' | 'success' | 'info'>> = {
  success: 'success',
  warning: 'money',
  info: 'info',
  accent: 'accent',
  danger: 'danger',
};

export default function AdminDashboardPage() {
  const list = useAdminList(() => adminApi.getDashboard(), []);
  const data = list.data;
  const loading = list.loading && !data;

  const totalOrders = data
    ? Object.values(data.ordersByStatus).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}

      {!list.error ? (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 sm:p-6">
              <p className="font-cinzel text-xs uppercase tracking-wider text-[#6B6B80]">REVENUE</p>
              {loading ? (
                <div aria-hidden="true" className="mt-2 h-10 w-40 animate-pulse rounded-md bg-[#23232F]" />
              ) : (
                <p className="mt-1 font-bebas text-5xl tracking-wide text-[#FFB800]">
                  {formatPrice(data?.revenueCents ?? 0)}
                </p>
              )}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFB800]/[0.06]"
              />
            </div>
            <StatTile label="ALL ORDERS" value={totalOrders} loading={loading} hint="Across every status" />
          </div>

          <SectionCard title="ORDERS BY STATUS" className="mb-8" padded={false}>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <StatTile key={i} label="" value="" loading />
                  ))
                : Object.entries(data?.ordersByStatus ?? {}).map(([status, count]) => {
                    const tone = toneForStatus(status);
                    return (
                      <StatTile
                        key={status}
                        label={status.replace(/_/g, ' ')}
                        value={count}
                        accent={STATUS_ACCENT[tone]}
                      />
                    );
                  })}
            </div>
          </SectionCard>

          <section aria-labelledby="low-stock-heading" className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="low-stock-heading"
                className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]"
              >
                LOW STOCK
              </h2>
              {data && data.lowStock.length > 0 ? (
                <span className="text-xs text-[#6B6B80]">{data.lowStock.length} variants</span>
              ) : null}
            </div>
            {loading ? (
              <AdminTable headers={['SKU', 'PRODUCT', 'ON HAND', 'RESERVED', 'SEVERITY']} isLoading skeletonRows={4}>
                <></>
              </AdminTable>
            ) : data && data.lowStock.length === 0 ? (
              <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
                <EmptyState
                  title="STOCK LEVELS HEALTHY"
                  description="No variants are at or below their low-stock threshold."
                />
              </div>
            ) : data ? (
              <AdminTable
                headers={['SKU', 'PRODUCT', 'ON HAND', 'RESERVED', 'SEVERITY']}
                caption="Variants with low stock"
              >
                {data.lowStock.map((v) => {
                  const severity = lowStockSeverity(v.stockOnHand, v.reserved);
                  return (
                    <TableRow key={v.variantId} className={severity.row}>
                      <td className={`${tdClass} font-mono text-xs text-[#F0F0F0]`}>{v.sku}</td>
                      <td className={tdClass}>{v.productName}</td>
                      <td className={tdClass}>{v.stockOnHand}</td>
                      <td
                        className={`${tdClass} ${v.reserved >= v.stockOnHand ? 'font-bold text-[#FF6B6B]' : ''}`}
                      >
                        {v.reserved}
                      </td>
                      <td className={tdClass}>
                        <span
                          className={`font-cinzel text-[11px] font-bold uppercase tracking-wider ${severity.chip}`}
                        >
                          {severity.label}
                        </span>
                      </td>
                    </TableRow>
                  );
                })}
              </AdminTable>
            ) : null}
          </section>

          <section aria-labelledby="recent-orders-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="recent-orders-heading"
                className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]"
              >
                RECENT ORDERS
              </h2>
              <Link
                href="/admin/orders"
                className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#FF6B00] transition-colors hover:text-[#FF8433]"
              >
                VIEW ALL →
              </Link>
            </div>
            {loading ? (
              <AdminTable headers={['ORDER', 'STATUS', 'TOTAL', 'PLACED', 'CONTACT']} isLoading skeletonRows={5}>
                <></>
              </AdminTable>
            ) : data && data.recentOrders.length === 0 ? (
              <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F]">
                <EmptyState
                  title="NO ORDERS YET"
                  description="New orders will appear here the moment customers check out."
                  action={
                    <Link
                      href="/admin/products"
                      className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#FF6B00] underline-offset-4 hover:underline"
                    >
                      MANAGE PRODUCTS →
                    </Link>
                  }
                />
              </div>
            ) : data ? (
              <AdminTable headers={['ORDER', 'STATUS', 'TOTAL', 'PLACED', 'CONTACT']} caption="Most recent orders" zebra>
                {data.recentOrders.map((o) => (
                  <TableRow key={o.orderNumber}>
                    <td className={tdClass}>
                      <Link
                        href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                        className="font-mono text-xs text-[#FF6B00] hover:underline underline-offset-4"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className={`${tdClass} text-[#FFB800]`}>{formatPrice(o.totalCents)}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(o.createdAt)}</td>
                    <td className={`${tdClass} max-w-[200px] truncate`}>{o.contactEmail}</td>
                  </TableRow>
                ))}
              </AdminTable>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
