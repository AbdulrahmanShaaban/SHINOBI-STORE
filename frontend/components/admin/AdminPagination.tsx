'use client';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({ page, totalPages, onPageChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null;
  const btn =
    'inline-flex min-h-[44px] items-center rounded-lg border border-[#2A2A3A] px-4 py-2 font-cinzel text-xs font-bold tracking-wider text-[#B8B8CC] hover:border-[#FF6B00] hover:text-[#F0F0F0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <nav className="mt-4 flex items-center justify-end gap-3" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={btn}
      >
        PREV
      </button>
      <span className="text-sm text-[#6B6B80]" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={btn}
      >
        NEXT
      </button>
    </nav>
  );
}
