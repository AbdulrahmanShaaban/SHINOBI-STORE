const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'border-[#FFB800]/40 bg-[#FFB800]/10 text-[#FFB800]',
  confirmed: 'border-[#7CFC00]/40 bg-[#7CFC00]/10 text-[#7CFC00]',
  processing: 'border-[#FFB800]/40 bg-[#FFB800]/10 text-[#FFB800]',
  shipped: 'border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00]',
  delivered: 'border-[#F0F0F0]/30 bg-[#F0F0F0]/10 text-[#F0F0F0]',
  cancelled: 'border-[#CC0000]/40 bg-[#CC0000]/10 text-[#CC0000]',
  refunded: 'border-[#CC0000]/40 bg-[#CC0000]/10 text-[#CC0000]',
  active: 'border-[#7CFC00]/40 bg-[#7CFC00]/10 text-[#7CFC00]',
  inactive: 'border-[#CC0000]/40 bg-[#CC0000]/10 text-[#CC0000]',
  draft: 'border-[#6B6B80]/40 bg-[#6B6B80]/10 text-[#6B6B80]',
  archived: 'border-[#6B6B80]/40 bg-[#6B6B80]/10 text-[#6B6B80]',
};

export default function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status] ?? 'border-[#2A2A3A] bg-[#12121A] text-[#B8B8CC]';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-cinzel text-[11px] font-bold uppercase tracking-wider ${style}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
