interface StatTileProps {
  label: string;
  value: string | number;
  accent?: 'money' | 'accent' | 'danger' | 'muted';
}

type Accent = NonNullable<StatTileProps['accent']>;

const ACCENT_CLASS: Record<Accent, string> = {
  money: 'text-[#FFB800]',
  accent: 'text-[#FF6B00]',
  danger: 'text-[#CC0000]',
  muted: 'text-[#B8B8CC]',
};

export default function StatTile({ label, value, accent }: StatTileProps) {
  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-4 sm:p-5">
      <p className="font-cinzel text-xs uppercase tracking-wider text-[#6B6B80]">{label}</p>
      <p
        className={`mt-1 font-bebas text-3xl ${accent ? ACCENT_CLASS[accent] : 'text-[#F0F0F0]'}`}
      >
        {value}
      </p>
    </div>
  );
}
