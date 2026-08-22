'use client';

import { useMemo, useState } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { formatPrice } from '@/lib/money';
import type { ProductDetail, VariantView } from '@/lib/api';
import StockBadge, { stockLevel } from './StockBadge';

interface OptionGroup {
  /** Dimension key: 'optionSize' | 'optionColor'. */
  dimension: 'optionSize' | 'optionColor';
  label: string;
  values: { value: string; soldOut: boolean }[];
}

/**
 * A picker row only exists when the dimension is a real choice
 * (more than one distinct value across active variants).
 */
function buildOptionGroups(variants: VariantView[]): OptionGroup[] {
  const groups: OptionGroup[] = [];
  for (const dimension of ['optionSize', 'optionColor'] as const) {
    const byValue = new Map<string, VariantView[]>();
    for (const variant of variants) {
      const value = variant[dimension];
      if (!value) continue;
      const list = byValue.get(value);
      if (list) list.push(variant);
      else byValue.set(value, [variant]);
    }
    if (byValue.size > 1) {
      groups.push({
        dimension,
        label: dimension === 'optionSize' ? 'Size' : 'Color',
        values: Array.from(byValue.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([value, list]) => ({
            value,
            soldOut: list.every((v) => v.available <= 0),
          })),
      });
    }
  }
  return groups;
}

export default function AddToCartPanel({ product }: { product: ProductDetail }) {
  const addItem = useCartStore((s) => s.addItem);

  const optionGroups = useMemo(() => buildOptionGroups(product.variants), [product.variants]);

  // Single source of selection truth: one entry per option group.
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const matchingVariant = useMemo(
    () =>
      product.variants.find((v) =>
        optionGroups.every(
          (group) =>
            !selected[group.dimension] || v[group.dimension] === selected[group.dimension],
        ),
      ) ?? null,
    [product.variants, optionGroups, selected],
  );

  // When the current quantity exceeds a newly-selected variant's availability,
  // clamp it so the CTA never promises more than can ship.
  const available = matchingVariant?.available ?? 0;
  const effectiveQuantity = Math.min(quantity, Math.max(1, available));

  // A group counts as satisfied only when the user picked a value for it —
  // an empty selection must not silently match the first variant.
  const needsSelection =
    optionGroups.length > 0 &&
    optionGroups.some((group) => !selected[group.dimension]);

  // Until every option group has an explicit choice, the panel must not
  // imply a purchasable state (badge/stepper would otherwise reflect the
  // first matching variant and mislead).
  const level: ReturnType<typeof stockLevel> = needsSelection
    ? 'unavailable'
    : stockLevel(matchingVariant);
  const priceCents = matchingVariant?.priceCents ?? product.variants[0]?.priceCents ?? null;
  const compareAt = matchingVariant?.compareAtPriceCents ?? null;

  const [justAdded, setJustAdded] = useState(false);
  const [announce, setAnnounce] = useState('');

  const onAdd = () => {
    if (!matchingVariant || matchingVariant.available <= 0 || needsSelection) return;
    addItem({
      variantId: matchingVariant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel:
        [matchingVariant.optionSize, matchingVariant.optionColor].filter(Boolean).join(' / ') ||
        'Standard',
      priceCents: matchingVariant.priceCents,
      imageUrl: product.images[0]?.url ?? '',
      maxQuantity: matchingVariant.available,
      quantity: effectiveQuantity,
    });
    setJustAdded(true);
    setAnnounce(`${effectiveQuantity} × ${product.name} added to cart`);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <div className="add-to-cart-panel flex flex-col gap-5">
      {/* Price row */}
      <div className="flex items-baseline gap-3">
        <span
          className="font-bebas text-4xl text-[#FFB800]"
          aria-label={`Price ${formatPrice(priceCents)}`}
        >
          {formatPrice(priceCents)}
        </span>
        {compareAt !== null && priceCents !== null && compareAt > priceCents && (
          <span className="font-inter text-[#6B6B80] line-through">{formatPrice(compareAt)}</span>
        )}
      </div>

      <StockBadge level={level} available={available || undefined} />

      {/* Option pickers */}
      {optionGroups.map((group) => (
        <fieldset key={group.dimension} className="flex flex-col gap-2">
          <legend className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80] mb-1">
            {group.label}
          </legend>
          <div role="radiogroup" aria-label={`${group.label} options`} className="flex flex-wrap gap-2">
            {group.values.map(({ value, soldOut }) => {
              const isSelected = selected[group.dimension] === value;
              return (
                <button
                  key={value}
                  role="radio"
                  aria-checked={isSelected}
                  disabled={soldOut}
                  onClick={() =>
                    setSelected((prev) => ({ ...prev, [group.dimension]: value }))
                  }
                  className={`min-w-[52px] rounded-lg border px-3 py-2 font-inter text-sm transition-colors focus-visible:border-[#FF6B00] ${
                    soldOut
                      ? 'border-[#2A2A3A] text-[#6B6B80]/50 line-through cursor-not-allowed'
                      : isSelected
                        ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-[#FF6B00]'
                        : 'border-[#2A2A3A] text-[#F0F0F0] hover:border-[#FF6B00]/60'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* Quantity + CTA */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        {level === 'in_stock' && (
          <QuantityStepper
            value={effectiveQuantity}
            max={available}
            onChange={(next) => {
              setQuantity(next);
              if (justAdded) setJustAdded(false);
            }}
          />
        )}
        <button
          onClick={onAdd}
          disabled={level === 'sold_out' || needsSelection || level === 'unavailable'}
          className={`cta-button flex-1 h-[56px] rounded-lg font-cinzel font-bold tracking-wider text-base transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
            level === 'sold_out'
              ? 'bg-[#16161F] text-[#6B6B80] border border-[#2A2A3A]'
              : justAdded
                ? 'bg-[#3DDC84] text-[#0A0A0F]'
                : 'bg-[#CC0000] text-[#F0F0F0] hover:bg-[#FF6B00] disabled:bg-[#16161F] disabled:text-[#6B6B80] disabled:border disabled:border-[#2A2A3A]'
          }`}
        >
          {level === 'sold_out'
            ? 'SOLD OUT'
            : needsSelection
              ? `SELECT ${optionGroups.map((g) => g.label.toUpperCase()).join(' & ')}`
              : justAdded
                ? 'ADDED TO CART ✓'
                : 'ADD TO CART'}
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

function QuantityStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const clamp = (n: number) => Math.min(Math.max(1, n), max);

  return (
    <div
      role="group"
      aria-label="Quantity"
      className="flex items-center justify-between gap-2 border border-[#2A2A3A] rounded-lg px-2 h-[56px] min-w-[132px]"
    >
      <button
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="w-9 h-9 rounded-md bg-[#16161F] text-[#F0F0F0] text-xl leading-none hover:bg-[#FF6B00] transition-colors disabled:opacity-40 disabled:hover:bg-[#16161F]"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`Quantity, ${value} selected`}
        value={value}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          if (!Number.isNaN(parsed)) onChange(clamp(parsed));
        }}
        onBlur={(e) => {
          const parsed = parseInt(e.target.value, 10);
          onChange(clamp(Number.isNaN(parsed) ? 1 : parsed));
          if (e.target.value !== String(clamp(parseInt(e.target.value, 10)))) {
            e.target.value = String(value);
          }
        }}
        className="w-10 text-center bg-transparent font-bebas text-2xl text-[#F0F0F0] outline-none"
      />
      <button
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="w-9 h-9 rounded-md bg-[#16161F] text-[#F0F0F0] text-xl leading-none hover:bg-[#FF6B00] transition-colors disabled:opacity-40 disabled:hover:bg-[#16161F]"
      >
        +
      </button>
    </div>
  );
}
