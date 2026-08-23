import type { ReactNode } from 'react';

interface AdminTableProps {
  headers: readonly string[];
  children: ReactNode;
}

export default function AdminTable({ headers, children }: AdminTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#2A2A3A] bg-[#16161F]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2A3A]">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left font-cinzel text-xs uppercase tracking-wider text-[#6B6B80]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-[#1D1D2A] last:border-b-0 hover:bg-[#12121A]/60">{children}</tr>;
}
