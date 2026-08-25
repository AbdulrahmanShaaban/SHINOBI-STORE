/**
 * Editorial defaults + CMS merge logic for the CharacterShowcase section.
 * Deliberately a plain module (no "use client"): it is imported by the
 * server-rendered homepage (merge step) and by the client component
 * (fallback rendering), so the source of truth must live outside any
 * bundle boundary.
 */

export interface Character {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  subline: string;
  image: string;
  alt: string;
  skills: string[];
}

/** Shape delivered by the featured_characters CMS schema (per item). */
export interface CmsShowcaseCharacter {
  name: string;
  slug: string;
  imageUrl?: string;
  tagline?: string;
}

export const DEFAULT_CHARACTERS: Character[] = [
  {
    number: "01",
    eyebrow: "THE FOURTH HOKAGE",
    title: "MINATO NAMIKAZE",
    description: "The Yellow Flash. Precision, speed, and a will strong enough to protect everyone behind him.",
    subline: "THE YELLOW FLASH",
    image: "/characters/minato.png",
    alt: "Minato Namikaze",
    skills: ["Flying Thunder God", "Rasengan", "Fuinjutsu"],
  },
  {
    number: "02",
    eyebrow: "THE AKATSUKI FOUNDER",
    title: "PAIN NAGATO",
    description: "Those who do not understand true pain can never understand true peace.",
    subline: "THE SIX PATHS OF PAIN",
    image: "/characters/pain.png",
    alt: "Pain Nagato",
    skills: ["Rinnegan", "Almighty Push", "Planetary Devastation"],
  },
  {
    number: "03",
    eyebrow: "THE MAN BEHIND THE MASK",
    title: "OBITO UCHIHA",
    description: "A broken dream, a borrowed identity, and a world he wanted to reshape in his own image.",
    subline: "THE MASKED SHINOBI",
    image: "/characters/obito-default.png",
    alt: "Obito Uchiha",
    skills: ["Kamui", "Sharingan", "Wood Release"],
  },
];

/**
 * The designed composition needs three panels; fewer valid CMS items than
 * this falls back to the hardcoded trio wholesale — same spirit as
 * FALLBACKS.hero in app/page.tsx: partial CMS data must never produce
 * half-populated panels.
 */
export const SHOWCASE_MIN_ITEMS = 3;

function cmsItems(config: Record<string, unknown> | undefined): CmsShowcaseCharacter[] {
  const raw = Array.isArray(config?.items) ? config.items : [];
  return raw
    .filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === 'object')
    .map((entry) => ({
      name: typeof entry.name === 'string' ? entry.name.trim() : '',
      slug: typeof entry.slug === 'string' ? entry.slug.trim() : '',
      imageUrl: typeof entry.imageUrl === 'string' ? entry.imageUrl.trim() : '',
      tagline: typeof entry.tagline === 'string' ? entry.tagline.trim() : '',
    }))
    .filter((item) => item.name !== '');
}

/**
 * Resolves the featured_characters CMS key into full panel data. The admin
 * controls identity and art (name → title/alt, imageUrl → image, tagline →
 * subline); editorial copy (eyebrow, description, skills) comes from the
 * curated default for that slot. Slots cycle if more than the three designed
 * panels are published. Returns undefined whenever the CMS override should
 * be ignored entirely (unset or below the minimum).
 */
export function resolveShowcaseCharacters(
  config: Record<string, unknown> | undefined,
): Character[] | undefined {
  const items = cmsItems(config);
  if (items.length < SHOWCASE_MIN_ITEMS) return undefined;

  return items.map((item, index) => {
    const base = DEFAULT_CHARACTERS[index % DEFAULT_CHARACTERS.length];
    return {
      ...base,
      number: String(index + 1).padStart(2, '0'),
      title: item.name,
      alt: item.name,
      image: item.imageUrl || base.image,
      subline: item.tagline || base.subline,
    };
  });
}
