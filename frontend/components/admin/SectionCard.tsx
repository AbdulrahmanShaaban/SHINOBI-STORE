import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  id?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  tone?: 'default' | 'danger' | 'raised';
}

export default function SectionCard({
  title,
  id,
  actions,
  children,
  className = '',
  padded = true,
  tone = 'default',
}: SectionCardProps) {
  const borderTone =
    tone === 'danger'
      ? 'border border-dashed border-[#CC0000]/40 bg-[#12121A]'
      : tone === 'raised'
        ? 'border border-[#2A2A3A] bg-[#12121A]'
        : 'border border-[#2A2A3A] bg-[#16161F]';
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className={`rounded-xl ${borderTone} ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1D1D2A] px-5 py-4">
          {title ? (
            <h2
              id={id ? `${id}-heading` : undefined}
              className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]"
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      ) : null}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}
