import type { VariantView } from '@/lib/api';

export type StockLevel = 'in_stock' | 'low_stock' | 'sold_out' | 'unavailable';

export function stockLevel(variant: VariantView | null): StockLevel {
  if (!variant) return 'unavailable';
  if (variant.available <= 0) return 'sold_out';
  if (variant.available <= 5) return 'low_stock';
  return 'in_stock';
}

export default function StockBadge({
  level,
  available,
}: {
  level: StockLevel;
  available?: number;
}) {
  const labels: Record<StockLevel, string> = {
    in_stock: 'IN STOCK',
    low_stock:
      typeof available === 'number' && available > 0
        ? `ONLY ${available} LEFT`
        : 'LOW STOCK',
    sold_out: 'SOLD OUT',
    unavailable: 'SELECT OPTIONS',
  };

  const styles: Record<StockLevel, string> = {
    in_stock: 'text-[#3DDC84] border-[#3DDC84]/40 bg-[#3DDC84]/10',
    low_stock: 'text-[#FFB800] border-[#FFB800]/40 bg-[#FFB800]/10',
    sold_out: 'text-[#CC0000] border-[#CC0000]/40 bg-[#CC0000]/10',
    unavailable: 'text-[#6B6B80] border-[#2A2A3A] bg-transparent',
  };

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-bebas tracking-widest text-sm ${styles[level]}`}
    >
      {(level === 'low_stock' || level === 'sold_out') && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            level === 'sold_out' ? 'bg-[#CC0000]' : 'bg-[#FFB800]'
          }`}
        />
      )}
      {labels[level]}
    </span>
  );
}
