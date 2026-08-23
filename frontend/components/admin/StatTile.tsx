'use client';

import { Skeleton } from '@/components/admin/Skeleton';

interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'money' | 'accent' | 'danger' | 'muted' | 'success' | 'info';
  loading?: boolean;
}

type Accent = NonNullable<StatTileProps['accent']>;

const ACCENT_CLASS: Record<Accent, string> = {
  money: 'text-[#FFB800]',
  accent: 'text-[#FF6B00]',
  danger: 'text-[#FF6B6B]',
  muted: 'text-[#B8B8CC]',
  success: 'text-[#4ADE80]',
  info: 'text-[#C4B5FD]',
};

export default function StatTile({ label, value, hint, accent, loading }: StatTileProps) {
  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-4 transition-colors hover:border-[#3A3A4A] sm:p-5">
      <p className="font-cinzel text-xs uppercase tracking-wider text-[#6B6B80]">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p
          className={`mt-1 font-bebas text-3xl tracking-wide ${accent ? ACCENT_CLASS[accent] : 'text-[#F0F0F0]'}`}
        >
          {value}
        </p>
      )}
      {hint && !loading ? <p className="mt-1 text-xs text-[#6B6B80]">{hint}</p> : null}
    </div>
  );
}
