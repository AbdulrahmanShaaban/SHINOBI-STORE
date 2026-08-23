import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError, getProduct, listProducts } from '@/lib/api';
import ProductDetailView, {
  type RelatedProductsData,
} from '@/components/product/ProductDetailView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    const image = product.images[0]?.url
      ? [{ url: product.images[0].url, alt: product.images[0].altText || product.name }]
      : undefined;

    return {
      title: `${product.name} — Shinobi Store`,
      description:
        product.description.length > 160
          ? `${product.description.slice(0, 157)}…`
          : product.description,
      openGraph: {
        title: product.name,
        description: product.description.slice(0, 200),
        images: image,
        type: 'website',
      },
      twitter: { card: 'summary_large_image' },
    };
  } catch {
    return { title: 'Product not found — Shinobi Store' };
  }
}

async function loadRelated(slug: string): Promise<RelatedProductsData> {
  try {
    const product = await getProduct(slug);
    const byAnime = await listProducts({ anime: product.anime.slug, limit: 9 });
    let items = byAnime.items.filter((p) => p.slug !== slug).slice(0, 8);
    if (items.length < 2) {
      const byCategory = await listProducts({ category: product.category.slug, limit: 9 });
      const seen = new Set(items.map((i) => i.id));
      for (const candidate of byCategory.items) {
        if (candidate.slug !== slug && !seen.has(candidate.id) && items.length < 8) {
          items = [...items, candidate];
          seen.add(candidate.id);
        }
      }
    }
    return { items };
  } catch {
    // Related rail is a nice-to-have; the page must render without it.
    return { items: [] };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const [product, related] = await Promise.all([
    getProduct(slug).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    loadRelated(slug),
  ]);

  const inStockVariant = product.variants.find((v) => v.available > 0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    brand: { '@type': 'Brand', name: 'Shinobi Store' },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: 'USD',
      price: ((inStockVariant ?? product.variants[0])?.priceCents ?? 0) / 100,
      availability: inStockVariant
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // JSON.stringify does not escape "</script>" — without this a
          // product name/description could terminate the ld+json block (XSS).
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 pt-28 lg:pt-32 pb-24">
        <ProductDetailView product={product} related={related} />
      </main>
    </>
  );
}
