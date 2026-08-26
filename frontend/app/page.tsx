import HeroSection from '@/components/sections/hero/HeroSection';
import CardStack from '@/components/sections/cards/CardStack';
import ChooseShinobi from '@/components/sections/cards/ChooseShinobi';
import ShinobiCharacterCards from '@/components/sections/cards/ShinobiCharacterCards';
import MadaraSpecialCard from '@/components/sections/madara/MadaraSpecialCard';
import QuoteSection from '@/components/sections/showcase/QuoteSection';
import CharacterShowcase from '@/components/sections/showcase/CharacterShowcase';
import { resolveShowcaseCharacters } from '@/components/sections/showcase/showcase-characters';
import StoreFooter from '@/components/shared/StoreFooter';
import ScrollToTop from '@/components/shared/ScrollToTop';
import { contentApi, type ContentSection } from '@/lib/content-api';

/**
 * Single source of truth for homepage fallback copy and artwork. When the
 * content API is unreachable or a section is absent, the page renders exactly
 * what it did before the CMS integration: today's hero is pure artwork (no
 * title/subtitle overlay), and banner/testimonials are hidden until an admin
 * publishes them.
 */
const FALLBACKS = {
  hero: {
    title: '',
    subtitle: '',
    imageUrl: '',
    ctaLabel: '',
    ctaHref: '',
  },
  madara: {
    defaultImg: '/characters/madara-default.png',
    jutsuImg: '/characters/madara-six-paths.png',
    sixPathsImg: '/characters/madara-six-paths.png',
  },
} as const;

async function fetchHomepageSections(): Promise<ContentSection[]> {
  try {
    return await contentApi.getHomepage();
  } catch {
    // Storefront must never hard-fail because the CMS is down.
    return [];
  }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function CmsBannerStrip({ config }: { config: Record<string, unknown> }) {
  const title = str(config.title);
  if (!title) return null;
  const message = str(config.message);
  const imageUrl = str(config.imageUrl);
  const ctaLabel = str(config.ctaLabel);
  const ctaHref = str(config.ctaHref);
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#16161F]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      ) : null}
      <div className="relative mx-auto flex w-full max-w-[1900px] flex-col items-center gap-4 px-4 py-8 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div>
          <h2 className="font-bebas text-3xl tracking-wide text-[#F0F0F0]">{title}</h2>
          {message ? <p className="mt-1 text-sm text-[#B8B8CC]">{message}</p> : null}
        </div>
        {ctaHref && ctaLabel ? (
          <a
            href={ctaHref}
            className="shrink-0 rounded-lg border border-[#FF6B00]/60 bg-[#FF6B00]/10 px-6 py-2.5 font-cinzel text-sm font-bold tracking-wider text-[#FF6B00] transition-colors hover:bg-[#FF6B00]/20"
          >
            {ctaLabel}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function CmsTestimonials({ config }: { config: Record<string, unknown> }) {
  const raw = Array.isArray(config.items) ? config.items : [];
  const items = raw
    .filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === 'object')
    .map((entry) => ({ quote: str(entry.quote), author: str(entry.author) }))
    .filter((t) => t.quote !== '');
  if (items.length === 0) return null;
  return (
    <section aria-label="Testimonials" className="w-full bg-[#101014] py-16 md:py-24">
      <ul className="mx-auto grid max-w-[1300px] grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t, index) => (
          <li key={index} className="rounded-xl border border-white/10 bg-black/40 p-6">
            <blockquote className="text-sm leading-relaxed text-[#F5E6C8]/90">
              “{t.quote}”
            </blockquote>
            {t.author ? (
              <footer className="mt-4 font-cinzel text-xs uppercase tracking-[0.18em] text-[#FF6B00]">
                — {t.author}
              </footer>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function Home() {
  const sections = await fetchHomepageSections();
  const byKey = new Map(sections.map((section) => [section.key, section]));

  const heroConfig = byKey.get('hero')?.config;
  const bannerConfig = byKey.get('banner')?.config;
  const testimonialsConfig = byKey.get('testimonials')?.config;
  const madaraConfig = byKey.get('madara')?.config;
  const featuredCharactersConfig = byKey.get('featured_characters')?.config;

  return (
    <main className="home-hero-full min-h-screen bg-[#0A0A0F]">
      <HeroSection
        title={str(heroConfig?.title) || FALLBACKS.hero.title}
        subtitle={str(heroConfig?.subtitle) || FALLBACKS.hero.subtitle}
        imageUrl={str(heroConfig?.imageUrl) || FALLBACKS.hero.imageUrl}
        ctaLabel={str(heroConfig?.ctaLabel) || FALLBACKS.hero.ctaLabel}
        ctaHref={str(heroConfig?.ctaHref) || FALLBACKS.hero.ctaHref}
      />
      {bannerConfig ? <CmsBannerStrip config={bannerConfig} /> : null}
      <CardStack />
      <ChooseShinobi />
      <ShinobiCharacterCards />
      <MadaraSpecialCard
        defaultImg={str(madaraConfig?.defaultImg) || FALLBACKS.madara.defaultImg}
        jutsuImg={str(madaraConfig?.jutsuImg) || FALLBACKS.madara.jutsuImg}
        sixPathsImg={str(madaraConfig?.sixPathsImg) || FALLBACKS.madara.sixPathsImg}
      />
      <QuoteSection />
      {testimonialsConfig ? <CmsTestimonials config={testimonialsConfig} /> : null}
      <CharacterShowcase characters={resolveShowcaseCharacters(featuredCharactersConfig)} />
      <StoreFooter />
      <ScrollToTop />
    </main>
  );
}
