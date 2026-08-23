export type StatusTone =
  | 'success'
  | 'warning'
  | 'info'
  | 'accent'
  | 'danger'
  | 'neutral';

/**
 * Single source of truth for status → color across the admin. Unknown or
 * provider-specific statuses degrade to neutral instead of throwing.
 */
export const STATUS_TONE: Record<string, StatusTone> = {
  pending_payment: 'warning',
  pending: 'warning',
  requires_action: 'warning',
  confirmed: 'success',
  processing: 'info',
  shipped: 'accent',
  out_for_delivery: 'accent',
  delivered: 'success',
  completed: 'success',
  paid: 'success',
  succeeded: 'success',
  cancelled: 'danger',
  canceled: 'danger',
  refunded: 'danger',
  failed: 'danger',
  declined: 'danger',
  banned: 'danger',
  inactive: 'danger',
  active: 'success',
  draft: 'neutral',
  archived: 'neutral',
  expired: 'neutral',
};

const TONE_BADGE_CLASS: Record<StatusTone, string> = {
  success: 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]',
  warning: 'border-[#FFB800]/40 bg-[#FFB800]/10 text-[#FFB800]',
  info: 'border-[#A78BFA]/40 bg-[#A78BFA]/10 text-[#C4B5FD]',
  accent: 'border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00]',
  danger: 'border-[#CC0000]/40 bg-[#CC0000]/10 text-[#FF6B6B]',
  neutral: 'border-[#6B6B80]/40 bg-[#6B6B80]/10 text-[#9B9BB0]',
};

const TONE_DOT_CLASS: Record<StatusTone, string> = {
  success: 'border-[#22C55E] bg-[#22C55E]',
  warning: 'border-[#FFB800] bg-[#FFB800]',
  info: 'border-[#A78BFA] bg-[#A78BFA]',
  accent: 'border-[#FF6B00] bg-[#FF6B00]',
  danger: 'border-[#CC0000] bg-[#CC0000]',
  neutral: 'border-[#6B6B80] bg-[#16161F]',
};

export function toneForStatus(status: string): StatusTone {
  return STATUS_TONE[status] ?? 'neutral';
}

export function toneBadgeClass(status: string): string {
  return TONE_BADGE_CLASS[toneForStatus(status)];
}

export function toneDotClass(tone: StatusTone): string {
  return TONE_DOT_CLASS[tone];
}

export default function StatusBadge({ status }: { status: string }) {
  const style = TONE_BADGE_CLASS[toneForStatus(status)];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-cinzel text-[11px] font-bold uppercase tracking-wider ${style}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
