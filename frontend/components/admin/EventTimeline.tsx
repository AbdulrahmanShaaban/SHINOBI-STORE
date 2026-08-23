import type { ReactNode } from 'react';
import Link from 'next/link';
import { toneDotClass, type StatusTone } from '@/components/admin/StatusBadge';

export interface TimelineItem {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
  tone?: StatusTone;
  href?: string;
}

interface EventTimelineProps {
  items: TimelineItem[];
  /** Highlights the last entry with the accent dot. */
  highlightLast?: boolean;
}

const TONE_TEXT: Record<StatusTone, string> = {
  success: 'text-[#4ADE80]',
  warning: 'text-[#FFB800]',
  info: 'text-[#C4B5FD]',
  accent: 'text-[#FF6B00]',
  danger: 'text-[#FF6B6B]',
  neutral: 'text-[#B8B8CC]',
};

export default function EventTimeline({ items, highlightLast = false }: EventTimelineProps) {
  return (
    <ol className="relative ml-2 space-y-7 border-l border-[#2A2A3A] pl-7">
      {items.map((item, index) => {
        const isLatest = index === items.length - 1;
        const tone: StatusTone =
          item.tone ?? (highlightLast && isLatest ? 'accent' : 'neutral');
        const dotClass = isLatest ? toneDotClass(tone) : 'border-[#6B6B80] bg-[#16161F]';
        const TitleContent = (
          <>
            <span className={`font-cinzel text-sm font-bold uppercase tracking-wider ${TONE_TEXT[tone]}`}>
              {item.title}
            </span>
            {item.subtitle ? <span className="ml-2 inline-block align-middle">{item.subtitle}</span> : null}
          </>
        );
        return (
          <li key={item.id} className="relative">
            <span
              aria-hidden="true"
              className={`absolute top-1.5 -left-[34px] h-3 w-3 rounded-full border-2 ${dotClass}`}
            />
            {item.href ? (
              <Link href={item.href} className="hover:underline underline-offset-4">
                {TitleContent}
              </Link>
            ) : (
              TitleContent
            )}
            {item.body ? <div className="mt-1 text-sm leading-relaxed text-[#B8B8CC]">{item.body}</div> : null}
            {item.meta ? <p className="mt-1 text-xs text-[#6B6B80]">{item.meta}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
