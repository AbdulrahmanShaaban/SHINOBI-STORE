import type { ReactNode } from 'react';
import { IconSearch } from '@/components/admin/icons';
import { inputClass } from '@/components/admin/ui';

interface DataTableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  /** Filter controls rendered next to the search box. */
  filters?: ReactNode;
  /** Buttons / meta rendered on the right side. */
  actions?: ReactNode;
}

export default function DataTableToolbar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search…',
  searchLabel = 'Search',
  filters,
  actions,
}: DataTableToolbarProps) {
  const hasSearch = onSearchChange !== undefined;
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {hasSearch ? (
          <div className="relative w-full sm:max-w-xs">
            <IconSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B80]"
            />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearchSubmit?.();
              }}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              className={`${inputClass} min-h-[44px] pl-10`}
            />
          </div>
        ) : null}
        {filters}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
