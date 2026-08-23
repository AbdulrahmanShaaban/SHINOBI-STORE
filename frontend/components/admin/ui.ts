export const cardClass = 'rounded-xl border border-[#2A2A3A] bg-[#16161F]';

export const inputClass =
  'w-full rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] transition-colors focus:border-[#FF6B00] focus:outline-none disabled:opacity-50';

export const inputInvalidClass =
  'w-full rounded-lg border border-[#CC0000] bg-[#12121A] px-4 py-2.5 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] transition-colors focus:border-[#CC0000] focus:outline-none disabled:opacity-50';

export const labelClass =
  'mb-1 block text-xs font-cinzel font-bold tracking-wider text-[#B8B8CC]';

export const helpClass = 'mt-1 block text-xs text-[#6B6B80]';

export const fieldErrorClass = 'mt-1 flex items-start gap-1 text-xs text-[#FF6B6B]';

const btnBase =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg font-cinzel text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B00] disabled:cursor-not-allowed disabled:opacity-50';

export const btnPrimary = `${btnBase} bg-[#FF6B00] px-5 text-[#160B02] hover:bg-[#FF8433]`;

export const btnDanger = `${btnBase} border border-[#CC0000]/70 bg-[#CC0000]/10 px-5 text-[#FF6B6B] hover:bg-[#CC0000]/25 focus-visible:outline-[#CC0000]`;

export const btnGhost = `${btnBase} border border-[#2A2A3A] px-5 text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0]`;

export const btnRow =
  'relative inline-flex min-h-[36px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#2A2A3A] px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] transition-colors after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[""] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B00] hover:border-[#FF6B00] hover:text-[#F0F0F0] disabled:cursor-not-allowed disabled:opacity-50';

export const btnRowDanger =
  'relative inline-flex min-h-[36px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#CC0000]/50 px-3 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#CC0000] transition-colors after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[""] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CC0000] hover:bg-[#CC0000]/10 disabled:cursor-not-allowed disabled:opacity-50';

export const tdClass = 'px-4 py-3 align-middle text-sm text-[#B8B8CC]';

export const sectionTitleClass =
  'font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]';
