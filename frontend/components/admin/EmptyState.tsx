import type { ReactNode } from 'react';
import { IconInbox } from '@/components/admin/icons';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-full border border-[#2A2A3A] bg-[#12121A] text-[#6B6B80]"
      >
        {icon ?? <IconInbox className="h-5 w-5" />}
      </span>
      <div>
        <p className="font-cinzel text-sm font-bold uppercase tracking-wider text-[#B8B8CC]">
          {title}
        </p>
        {description ? (
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[#6B6B80]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
