import Link from 'next/link';
import { formatPrice } from '@/lib/money';

/**
 * Shared product card — real link to a shareable product URL.
 * Server-compatible (no client hooks); animation wrappers live with callers.
 */
export default function ProductCard({
  product,
  className = '',
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    primaryImageUrl: string | null;
    priceFromCents: number | null;
    compareAtPriceCents?: number | null;
  };
  className?: string;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group flex flex-col rounded-xl overflow-hidden bg-[#16161F] border border-[#2A2A3A] hover:border-[#FF6B00]/60 focus-visible:border-[#FF6B00] focus-visible:outline-none transition-colors ${className}`}
    >
      <div className="aspect-square bg-[#12121A] flex items-center justify-center p-4">
        {product.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primaryImageUrl}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span aria-hidden="true" className="font-bebas text-[#6B6B80] text-5xl">
            忍
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-cinzel font-bold text-sm text-[#F0F0F0] group-hover:text-[#FF6B00] transition-colors line-clamp-2">
          {product.name}
        </h3>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-bebas text-xl text-[#FFB800]">
            {formatPrice(product.priceFromCents)}
          </span>
        {(() => {
          const compare = product.compareAtPriceCents ?? null;
          if (compare === null || product.priceFromCents === null || compare <= product.priceFromCents)
            return null;
          return (
            <span className="text-xs text-[#6B6B80] line-through" aria-hidden="true">
              {formatPrice(compare)}
            </span>
          );
        })()}
        </p>
      </div>
    </Link>
  );
}
