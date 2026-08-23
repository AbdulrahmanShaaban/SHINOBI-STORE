import type { ReactNode } from 'react';
import { Skeleton } from '@/components/admin/Skeleton';

interface AdminTableProps {
  headers: readonly string[];
  children: ReactNode;
  /** Renders pulsing placeholder rows instead of children. */
  isLoading?: boolean;
  skeletonRows?: number;
  /** Renders the empty state row instead of children. */
  isEmpty?: boolean;
  emptyState?: ReactNode;
  zebra?: boolean;
  caption?: string;
}

export default function AdminTable({
  headers,
  children,
  isLoading = false,
  skeletonRows = 6,
  isEmpty = false,
  emptyState,
  zebra = false,
  caption,
}: AdminTableProps) {
  const cols = headers.length;
  return (
    <div className="overflow-x-auto rounded-xl border border-[#2A2A3A] bg-[#16161F]">
      <table className="w-full text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-[#2A2A3A] bg-[#12121A]/70">
            {headers.map((header, i) => (
              <th
                key={`${header}-${i}`}
                scope="col"
                className={`whitespace-nowrap px-4 py-3.5 text-left font-cinzel text-[11px] uppercase tracking-[0.14em] text-[#6B6B80] ${
                  i === cols - 1 && header === '' ? 'text-right' : ''
                }`}
              >
                {header === '' ? <span className="sr-only">Actions</span> : header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={
            zebra ? '[&>tr:nth-child(odd)]:bg-[#12121A]/40' : undefined
          }
        >
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, row) => (
              <tr key={row} className="border-b border-[#1D1D2A] last:border-b-0">
                {headers.map((_, col) => (
                  <td key={col} className="px-4 py-4">
                    <Skeleton
                      className={`h-3.5 ${col === 0 ? 'w-24' : col === headers.length - 1 ? 'ml-auto w-12' : 'w-3/4'}`}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={cols} className="p-0">
                {emptyState ?? (
                  <p className="px-4 py-12 text-center text-sm text-[#6B6B80]">Nothing here yet.</p>
                )}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableRow({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`border-b border-[#1D1D2A] transition-colors last:border-b-0 hover:bg-[#12121A]/70 ${className}`}
    >
      {children}
    </tr>
  );
}
