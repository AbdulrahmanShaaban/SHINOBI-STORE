import StatTile from '@/components/admin/StatTile';
import type { QueueInfo } from '@/lib/admin-api';

interface QueueStatProps {
  queue: QueueInfo;
  selected: boolean;
  onSelect: () => void;
}

const COUNTS = [
  { key: 'completed', label: 'COMPLETED' },
  { key: 'failed', label: 'FAILED' },
  { key: 'active', label: 'ACTIVE' },
  { key: 'waiting', label: 'WAITING' },
  { key: 'delayed', label: 'DELAYED' },
] as const;

const ACCENTS: Partial<Record<(typeof COUNTS)[number]['key'], 'danger' | 'accent'>> = {
  failed: 'danger',
  active: 'accent',
};

export default function QueueStat({ queue, selected, onSelect }: QueueStatProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition-colors sm:p-5 ${
        selected
          ? 'border-[#FF6B00] bg-[#FF6B00]/[0.04] shadow-[0_0_28px_rgba(255,107,0,0.08)]'
          : 'border-[#2A2A3A] bg-[#16161F] hover:border-[#6B6B80]'
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="break-all font-bebas text-xl tracking-wide text-[#F0F0F0]">
          {queue.name}
        </span>
        {queue.counts.failed > 0 ? (
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#CC0000]/40 bg-[#CC0000]/10 px-2.5 py-0.5 font-cinzel text-[11px] font-bold uppercase tracking-wider text-[#FF6B6B]">
            DLQ {queue.dlqCount}
          </span>
        ) : null}
      </span>
      <span className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {COUNTS.map(({ key, label }) => (
          <StatTile key={key} label={label} value={queue.counts[key]} accent={ACCENTS[key]} />
        ))}
      </span>
    </button>
  );
}
