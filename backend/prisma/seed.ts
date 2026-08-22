/**
 * Deterministic catalog seed (plan §Phase 1).
 * - Idempotent: every entity is upserted by slug/sku — safe to re-run.
 * - No randomness: fixed prices/stock/ratings so tests are reproducible.
 * - Reuses existing public art paths served by the frontend (/<file>.png),
 *   so seeded URLs work as-is against the storefront origin.
 *
 * Run: pnpm --filter backend db:seed   (requires DATABASE_URL reachable)
 */
import { PrismaClient, product_status } from '@prisma/client';

const prisma = new PrismaClient();

interface VariantSpec {
  suffix: string;
  optionSize?: string;
  priceCents: number;
  compareAtPriceCents?: number;
  stockOnHand: number;
  reserved?: number;
}

interface ProductSpec {
  slug: string;
  name: string;
  description: string;
  category: string;
  anime: string;
  character: string | null;
  tags: string[];
  status?: product_status;
  featured?: boolean;
  ratingAvg: number;
  reviewCount: number;
  images: { url: string; altText: string }[];
  variants: VariantSpec[];
}

const APPAREL_SIZES = (base: number, compareAt?: number): VariantSpec[] => [
  { suffix: 's', optionSize: 'S', priceCents: base, compareAtPriceCents: compareAt, stockOnHand: 25 },
  { suffix: 'm', optionSize: 'M', priceCents: base, compareAtPriceCents: compareAt, stockOnHand: 40 },
  { suffix: 'l', optionSize: 'L', priceCents: base, compareAtPriceCents: compareAt, stockOnHand: 35, reserved: 3 },
  { suffix: 'xl', optionSize: 'XL', priceCents: base + 200, compareAtPriceCents: compareAt ? compareAt + 200 : undefined, stockOnHand: 20 },
  { suffix: 'xxl', optionSize: 'XXL', priceCents: base + 300, compareAtPriceCents: compareAt ? compareAt + 300 : undefined, stockOnHand: 10 },
];

const single = (priceCents: number, stockOnHand: number, compareAtPriceCents?: number): VariantSpec[] => [
  { suffix: 'default', priceCents, compareAtPriceCents, stockOnHand },
];

function skuOf(productSlug: string, v: VariantSpec): string {
  return `SS-${productSlug.toUpperCase().replace(/-/g, '_')}_${v.suffix.toUpperCase()}`;
}

const categories = [
  { slug: 'apparel', name: 'Apparel', sortOrder: 1 },
  { slug: 'accessories', name: 'Accessories', sortOrder: 2 },
  { slug: 'posters', name: 'Posters & Prints', sortOrder: 3 },
  { slug: 'figures', name: 'Figures', sortOrder: 4 },
];

const animes = [
  { slug: 'naruto', name: 'Naruto', description: 'Original series — the Hidden Leaf\'s number one hyperactive ninja.', imageUrl: '/naruto.png', isFeatured: true, sortOrder: 1 },
  { slug: 'naruto-shippuden', name: 'Naruto Shippuden', description: 'The war arc era — legends clash across the Five Great Nations.', imageUrl: '/kurama.png', isFeatured: true, sortOrder: 2 },
];

const characters = [
  { slug: 'naruto', name: 'Naruto Uzumaki', anime: 'naruto', imageUrl: '/naruto-default.png' },
  { slug: 'sasuke', name: 'Sasuke Uchiha', anime: 'naruto', imageUrl: '/sasuke-default.png' },
  { slug: 'minato', name: 'Minato Namikaze', anime: 'naruto', imageUrl: '/minato.png' },
  { slug: 'kurama', name: 'Kurama', anime: 'naruto-shippuden', imageUrl: '/kurama.png' },
  { slug: 'itachi', name: 'Itachi Uchiha', anime: 'naruto-shippuden', imageUrl: '/itachi-default.png' },
  { slug: 'madara', name: 'Madara Uchiha', anime: 'naruto-shippuden', imageUrl: '/madara-default.png' },
  { slug: 'obito', name: 'Obito Uchiha', anime: 'naruto-shippuden', imageUrl: '/obito-default.png' },
  { slug: 'pain', name: 'Pain (Nagato)', anime: 'naruto-shippuden', imageUrl: '/pain.png' },
];

const tags = [
  { slug: 'hoodie', name: 'Hoodie' },
  { slug: 't-shirt', name: 'T-Shirt' },
  { slug: 'poster', name: 'Poster' },
  { slug: 'figure', name: 'Figure' },
  { slug: 'keycap', name: 'Keycap' },
  { slug: 'akatsuki', name: 'Akatsuki' },
  { slug: 'uchiha', name: 'Uchiha Clan' },
  { slug: 'hokage', name: 'Hokage' },
];

const products: ProductSpec[] = [
  {
    slug: 'naruto-rasengan-hoodie', name: 'Rasengan Training Hoodie',
    description: 'Heavyweight fleece hoodie with an embroidered Rasengan swirl. Built for marathon training arcs.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'naruto', tags: ['hoodie'],
    featured: true, ratingAvg: 4.8, reviewCount: 214,
    images: [
      { url: '/naruto-rasengan.png', altText: 'Naruto forming a Rasengan' },
      { url: '/naruto-default.png', altText: 'Naruto Uzumaki portrait' },
    ],
    variants: APPAREL_SIZES(6900, 8900),
  },
  {
    slug: 'sasuke-chidori-hoodie', name: 'Chidori Storm Hoodie',
    description: 'Storm-grey hoodie crackling with Chidori lightning linework down both sleeves.',
    category: 'apparel', anime: 'naruto', character: 'sasuke', tags: ['hoodie', 'uchiha'],
    featured: true, ratingAvg: 4.7, reviewCount: 189,
    images: [{ url: '/sasuke-chidori.png', altText: 'Sasuke channeling Chidori' }],
    variants: APPAREL_SIZES(6900),
  },
  {
    slug: 'itachi-akatsuki-hoodie', name: 'Akatsuki Cloud Hoodie',
    description: 'Black hoodie scattered with red cloud motifs. A quiet tribute to the strongest of the Akatsuki.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'itachi', tags: ['hoodie', 'akatsuki', 'uchiha'],
    featured: true, ratingAvg: 4.9, reviewCount: 342,
    images: [{ url: '/itachi-default.png', altText: 'Itachi in Akatsuki robes' }],
    variants: APPAREL_SIZES(7400, 9400),
  },
  {
    slug: 'madara-uchiha-hoodie', name: 'Uchiha Founder Hoodie',
    description: 'Gunmetal hoodie honoring the founder of the Uchiha clan. Gunbai silhouette on the back.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'madara', tags: ['hoodie', 'uchiha'],
    ratingAvg: 4.6, reviewCount: 156,
    images: [{ url: '/madara-default.png', altText: 'Madara Uchiha portrait' }],
    variants: APPAREL_SIZES(7200),
  },
  {
    slug: 'obito-masked-hoodie', name: 'Masked Man Hoodie',
    description: 'Orange-and-black hoodie echoing Tobi\'s masked persona. Spiral emblem over the heart.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'obito', tags: ['hoodie', 'akatsuki'],
    ratingAvg: 4.4, reviewCount: 98,
    images: [{ url: '/obito-default.png', altText: 'Obito wearing his mask' }],
    variants: APPAREL_SIZES(6700),
  },
  {
    slug: 'minato-hokage-hoodie', name: 'Yellow Flash Hoodie',
    description: 'White-and-gold hoodie celebrating Konoha\'s Fourth Hokage. Flying Raijin mark on the chest.',
    category: 'apparel', anime: 'naruto', character: 'minato', tags: ['hoodie', 'hokage'],
    featured: true, ratingAvg: 4.8, reviewCount: 201,
    images: [{ url: '/minato.png', altText: 'Minato Namikaze, the Yellow Flash' }],
    variants: APPAREL_SIZES(7000, 8500),
  },
  {
    slug: 'naruto-sage-tee', name: 'Sage Mode Tee',
    description: 'Breathable cotton tee with toad-sage eye linework across the shoulders.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'naruto', tags: ['t-shirt'],
    ratingAvg: 4.5, reviewCount: 132,
    images: [{ url: '/naruto.png', altText: 'Naruto in Sage Mode' }],
    variants: APPAREL_SIZES(3200),
  },
  {
    slug: 'sasuke-curse-tee', name: 'Curse Mark Tee',
    description: 'Faded three-tomoe curse pattern wrapping from hem to collar.',
    category: 'apparel', anime: 'naruto', character: 'sasuke', tags: ['t-shirt', 'uchiha'],
    ratingAvg: 4.3, reviewCount: 87,
    images: [{ url: '/sasuke-default.png', altText: 'Sasuke Uchiha portrait' }],
    variants: APPAREL_SIZES(3000),
  },
  {
    slug: 'itachi-crow-tee', name: 'Crow Genjutsu Tee',
    description: 'Soft-wash tee where crows dissolve into a single Sharingan at the neckline.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'itachi', tags: ['t-shirt', 'uchiha'],
    ratingAvg: 4.7, reviewCount: 165,
    images: [{ url: '/itachi-mangekyou.png', altText: 'Itachi Mangekyo Sharingan art' }],
    variants: APPAREL_SIZES(3300, 4200),
  },
  {
    slug: 'madara-six-paths-tee', name: 'Six Paths Tee',
    description: 'Black tee with Rinnegan-ring geometry radiating from center chest.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'madara', tags: ['t-shirt', 'uchiha'],
    ratingAvg: 4.6, reviewCount: 121,
    images: [{ url: '/madara-six-paths.png', altText: 'Madara in Six Paths form' }],
    variants: APPAREL_SIZES(3500),
  },
  {
    slug: 'pain-six-paths-tee', name: 'Pain Almighty Push Tee',
    description: 'Charcoal tee capturing Shinra Tensei shockwave rings around a Rinnegan core.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'pain', tags: ['t-shirt', 'akatsuki'],
    ratingAvg: 4.4, reviewCount: 76,
    images: [{ url: '/pain.png', altText: 'Pain with Rinnegan eyes' }],
    variants: APPAREL_SIZES(3100),
  },
  {
    slug: 'kurama-jinchuriki-tee', name: 'Nine-Tails Jinchuriki Tee',
    description: 'Burnt-orange tee with chakra-fox brushstrokes climbing the left side.',
    category: 'apparel', anime: 'naruto-shippuden', character: 'kurama', tags: ['t-shirt'],
    ratingAvg: 4.5, reviewCount: 110,
    images: [{ url: '/kurama.png', altText: 'Kurama, the Nine-Tails' }],
    variants: APPAREL_SIZES(3200),
  },
  {
    slug: 'akatsuki-cloud-keycap', name: 'Akatsuki Cloud Keycap',
    description: 'Artisan resin keycap with a suspended red cloud. Cherry MX compatible.',
    category: 'accessories', anime: 'naruto-shippuden', character: 'itachi', tags: ['keycap', 'akatsuki'],
    featured: true, ratingAvg: 4.9, reviewCount: 64,
    images: [{ url: '/kunai.svg', altText: 'Kunai icon' }],
    variants: single(2400, 60),
  },
  {
    slug: 'sharingan-deskmat', name: 'Sharingan Desk Mat',
    description: 'Stitched-edge desk mat with a slowly rotating triple-tomoe print. 900×400mm.',
    category: 'accessories', anime: 'naruto', character: 'sasuke', tags: ['uchiha'],
    ratingAvg: 4.6, reviewCount: 58,
    images: [{ url: '/sky.webp', altText: 'Sky texture background' }],
    variants: single(3600, 80),
  },
  {
    slug: 'hidden-leaf-lanyard', name: 'Hidden Leaf Lanyard',
    description: 'Woven lanyard with repeating leaf-symbol jacquard and metal kunai clasp.',
    category: 'accessories', anime: 'naruto', character: null, tags: [],
    status: product_status.archived,
    ratingAvg: 4.0, reviewCount: 12,
    images: [{ url: '/kunai.svg', altText: 'Kunai icon' }],
    variants: single(1200, 0),
  },
  {
    slug: 'valley-of-the-end-poster', name: 'Valley of the End Poster',
    description: 'A3 giclée print of the two statues guarding the falls where rivals first clashed.',
    category: 'posters', anime: 'naruto', character: null, tags: ['poster'],
    ratingAvg: 4.7, reviewCount: 143,
    images: [{ url: '/mountain.webp', altText: 'Mountain valley artwork' }],
    variants: single(2200, 140),
  },
  {
    slug: 'six-paths-poster', name: 'Six Paths Ascension Poster',
    description: 'Metallic ink print of Madara ascending with truth-seeking orbs in orbit.',
    category: 'posters', anime: 'naruto-shippuden', character: 'madara', tags: ['poster', 'uchiha'],
    featured: true, ratingAvg: 4.8, reviewCount: 97,
    images: [{ url: '/madara-six-paths.png', altText: 'Madara Six Paths artwork' }],
    variants: single(2800, 95),
  },
  {
    slug: 'mangekyou-triptych-poster', name: 'Mangekyo Triptych Poster Set',
    description: 'Three-print set: Itachi, Sasuke, and Obito Mangekyo patterns on brushed foil.',
    category: 'posters', anime: 'naruto-shippuden', character: 'itachi', tags: ['poster', 'uchiha'],
    ratingAvg: 4.9, reviewCount: 176,
    images: [{ url: '/itachi-mangekyou.png', altText: 'Mangekyo Sharingan triptych' }],
    variants: single(4200, 50, 5200),
  },
  {
    slug: 'rasengan-vs-chidori-poster', name: 'Rasengan vs Chidori Poster',
    description: 'Diptych poster splitting the frame between spiraling blue and crackling violet.',
    category: 'posters', anime: 'naruto', character: 'naruto', tags: ['poster'],
    ratingAvg: 4.6, reviewCount: 88,
    images: [
      { url: '/naruto-rasengan.png', altText: 'Rasengan half of the diptych' },
      { url: '/sasuke-chidori.png', altText: 'Chidori half of the diptych' },
    ],
    variants: single(2600, 120),
  },
  {
    slug: 'naruto-rasengan-figure', name: 'Rasengan 1/8 Scale Figure',
    description: 'PVC figure of Naruto mid-Rasengan with translucent chakra FX and swappable hands.',
    category: 'figures', anime: 'naruto-shippuden', character: 'naruto', tags: ['figure'],
    featured: true, ratingAvg: 4.8, reviewCount: 205,
    images: [{ url: '/naruto-rasengan.png', altText: 'Naruto Rasengan figure box art' }],
    variants: single(11900, 30, 13900),
  },
  {
    slug: 'sasuke-chidori-figure', name: 'Chidori 1/8 Scale Figure',
    description: 'PVC figure of Sasuke lunging with lightning-wrapped fist on a shattered-rock base.',
    category: 'figures', anime: 'naruto', character: 'sasuke', tags: ['figure'],
    ratingAvg: 4.7, reviewCount: 158,
    images: [{ url: '/sasuke-chidori.png', altText: 'Sasuke Chidori figure box art' }],
    variants: single(11900, 26),
  },
  {
    slug: 'itachi-mangekyou-figure', name: 'Itachi Crow Prime Figure',
    description: 'Premium Itachi figure surrounded by crow-flock transparent wings.',
    category: 'figures', anime: 'naruto-shippuden', character: 'itachi', tags: ['figure', 'uchiha'],
    ratingAvg: 4.9, reviewCount: 264,
    images: [{ url: '/itachi-mangekyou.png', altText: 'Itachi crow figure art' }],
    variants: single(14900, 18),
  },
  {
    slug: 'kurama-mode-figure', name: 'Kurama Link Mode Figure',
    description: 'Glow-in-the-dark chakra cloak Kurama statue, 30cm tall. [Pre-launch preview]',
    category: 'figures', anime: 'naruto-shippuden', character: 'kurama', tags: ['figure'],
    status: product_status.draft,
    ratingAvg: 0, reviewCount: 0,
    images: [{ url: '/kurama.png', altText: 'Kurama mode figure concept' }],
    variants: single(19900, 100),
  },
  {
    slug: 'pain-gods-cape-poster', name: 'Six Paths of Pain Poster',
    description: 'All six Pain bodies arranged as a divine court. [Unreleased layout]',
    category: 'posters', anime: 'naruto-shippuden', character: 'pain', tags: ['poster', 'akatsuki'],
    status: product_status.draft,
    ratingAvg: 0, reviewCount: 0,
    images: [{ url: '/pain.png', altText: 'Six Paths of Pain concept' }],
    variants: single(2900, 75),
  },
];

async function main(): Promise<void> {
  console.log('Seeding taxonomies…');
  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder, isActive: true },
      create: c,
    });
    categoryIds.set(c.slug, row.id);
  }

  const animeIds = new Map<string, string>();
  for (const a of animes) {
    const row = await prisma.anime.upsert({ where: { slug: a.slug }, update: {}, create: a });
    animeIds.set(a.slug, row.id);
  }

  const characterIds = new Map<string, string>();
  for (const ch of characters) {
    const { anime, ...data } = ch;
    const row = await prisma.character.upsert({
      where: { slug: ch.slug },
      update: {},
      create: { ...data, animeId: animeIds.get(anime) },
    });
    characterIds.set(ch.slug, row.id);
  }

  const tagIds = new Map<string, string>();
  for (const t of tags) {
    const row = await prisma.tag.upsert({ where: { slug: t.slug }, update: {}, create: t });
    tagIds.set(t.slug, row.id);
  }

  console.log('Seeding products…');
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        categoryId: categoryIds.get(p.category)!,
        animeId: animeIds.get(p.anime) ?? null,
        characterId: p.character ? characterIds.get(p.character) ?? null : null,
        status: p.status ?? product_status.active,
        featured: p.featured ?? false,
        ratingAvg: p.ratingAvg,
        reviewCount: p.reviewCount,
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        categoryId: categoryIds.get(p.category)!,
        animeId: animeIds.get(p.anime) ?? null,
        characterId: p.character ? characterIds.get(p.character) ?? null : null,
        status: p.status ?? product_status.active,
        featured: p.featured ?? false,
        ratingAvg: p.ratingAvg,
        reviewCount: p.reviewCount,
      },
    });

    for (const [i, img] of p.images.entries()) {
      const existing = await prisma.productImage.findFirst({
        where: { productId: product.id, url: img.url },
      });
      if (!existing) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: img.url,
            altText: img.altText,
            sortOrder: i,
            isPrimary: i === 0,
          },
        });
      }
    }

    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { sku: skuOf(p.slug, v) },
        update: {
          optionSize: v.optionSize ?? null,
          priceCents: v.priceCents,
          compareAtPriceCents: v.compareAtPriceCents ?? null,
          stockOnHand: v.stockOnHand,
          reserved: v.reserved ?? 0,
        },
        create: {
          productId: product.id,
          sku: skuOf(p.slug, v),
          optionSize: v.optionSize ?? null,
          priceCents: v.priceCents,
          compareAtPriceCents: v.compareAtPriceCents ?? null,
          stockOnHand: v.stockOnHand,
          reserved: v.reserved ?? 0,
        },
      });
    }

    for (const tagSlug of p.tags) {
      await prisma.productTag.upsert({
        where: { productId_tagId: { productId: product.id, tagId: tagIds.get(tagSlug)! } },
        update: {},
        create: { productId: product.id, tagId: tagIds.get(tagSlug)! },
      });
    }
  }

  const counts = {
    categories: await prisma.category.count(),
    animes: await prisma.anime.count(),
    characters: await prisma.character.count(),
    tags: await prisma.tag.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    images: await prisma.productImage.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
