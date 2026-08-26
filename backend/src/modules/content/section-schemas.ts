import { plainToInstance, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
  ValidateNested,
  ValidationOptions,
  validateSync,
} from 'class-validator';

/**
 * §Phase 8 — single source of truth for homepage section config shapes.
 * The DB stores arbitrary JSONB, but nothing reaches it without passing the
 * matching DTO below (AdminContentService routes through validateConfig).
 */

export const SECTION_KEYS = [
  'hero',
  'featured_products',
  'featured_characters',
  'trending_anime',
  'collections',
  'madara',
  'banner',
  'testimonials',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/** Absolute http(s) URL or a root-relative asset path ("/media/...", "/x.png"). */
const MEDIA_URL_PATTERN = /^(https?:\/\/\S+|\/\S+)$/i;

export function IsMediaUrl(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isMediaUrl',
      constraints: [],
      validator: {
        validate: (value): boolean =>
          typeof value === 'string' &&
          value.length <= 500 &&
          MEDIA_URL_PATTERN.test(value),
        defaultMessage: (): string =>
          'must be an http(s) URL or a root-relative path starting with /',
      },
    },
    validationOptions,
  );
}

/** Storefront slugs: lowercase kebab-case, matching catalog/anime seeds. */
export function IsSlug(maxLength = 120, validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isSlug',
      constraints: [maxLength],
      validator: {
        validate: (value): boolean =>
          typeof value === 'string' &&
          value.length >= 1 &&
          value.length <= maxLength &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
        defaultMessage: (): string => 'must be a lowercase kebab-case slug',
      },
    },
    validationOptions,
  );
}

// ───────────────────────────── hero ─────────────────────────────

export class HeroConfigDto {
  @IsString()
  @MaxLength(80)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string;

  @IsOptional()
  @IsMediaUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ctaHref?: string;
}

// ─────────────────────── featured_products ───────────────────────

export class FeaturedProductsConfigDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsSlug(120, { each: true })
  productSlugs?: string[];
}

// ───────────────────── featured_characters ─────────────────────

export class FeaturedCharacterItemDto {
  @IsString()
  @MaxLength(40)
  name!: string;

  @IsSlug(120)
  slug!: string;

  @IsOptional()
  @IsMediaUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tagline?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(10)
  price?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  originalPrice?: string;
}

export class FeaturedCharactersConfigDto {
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => FeaturedCharacterItemDto)
  items!: FeaturedCharacterItemDto[];
}

// ─────────────────────── trending_anime ───────────────────────

export class TrendingAnimeConfigDto {
  @IsArray()
  @ArrayMaxSize(8)
  @IsSlug(120, { each: true })
  animeSlugs!: string[];
}

// ───────────────────────── collections ─────────────────────────

export class CollectionItemDto {
  @IsString()
  @MaxLength(40)
  title!: string;

  @IsString()
  @MaxLength(200)
  href!: string;

  @IsOptional()
  @IsMediaUrl()
  imageUrl?: string;
}

export class CollectionsConfigDto {
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => CollectionItemDto)
  items!: CollectionItemDto[];
}

// ───────────────────────────── madara ─────────────────────────────

/**
 * MadaraSpecialCard imagery. All optional — the storefront falls back to the
 * bundled artwork per field when a value is unset. sandImg deliberately stays
 * a fixed asset: it is rendered ~42× as a blurred, screen-blended particle
 * texture inside the GSAP orbit (animation art direction), not admin content.
 */
export class MadaraConfigDto {
  @IsOptional()
  @IsMediaUrl()
  defaultImg?: string;

  @IsOptional()
  @IsMediaUrl()
  jutsuImg?: string;

  @IsOptional()
  @IsMediaUrl()
  sixPathsImg?: string;
}

// ───────────────────────────── banner ─────────────────────────────

export class BannerConfigDto {
  @IsString()
  @MaxLength(60)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  message?: string;

  @IsOptional()
  @IsMediaUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ctaHref?: string;
}

// ───────────────────────── testimonials ─────────────────────────

export class TestimonialItemDto {
  @IsString()
  @MaxLength(240)
  quote!: string;

  @IsString()
  @MaxLength(40)
  author!: string;
}

export class TestimonialsConfigDto {
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => TestimonialItemDto)
  items!: TestimonialItemDto[];
}

// ───────────────────────── registry / gate ─────────────────────────

const SECTION_CONFIG_SCHEMAS: Record<SectionKey, new () => object> = {
  hero: HeroConfigDto,
  featured_products: FeaturedProductsConfigDto,
  featured_characters: FeaturedCharactersConfigDto,
  trending_anime: TrendingAnimeConfigDto,
  collections: CollectionsConfigDto,
  madara: MadaraConfigDto,
  banner: BannerConfigDto,
  testimonials: TestimonialsConfigDto,
};

export type ConfigValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Validate one section's config payload against its schema DTO. Unknown
 * properties are rejected; known ones are returned normalized (nested items
 * instantiated), ready to persist as JSONB.
 */
export function validateConfig(key: string, config: unknown): ConfigValidationResult {
  const schema = SECTION_CONFIG_SCHEMAS[key as SectionKey];
  if (!schema) {
    return { ok: false, error: `unknown section key '${key}'` };
  }
  if (!isPlainObject(config)) {
    return { ok: false, error: 'config must be a JSON object' };
  }

  const instance = plainToInstance(schema, config);
  const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const reasons: string[] = [];
    function collect(errs: import('class-validator').ValidationError[], prefix: string) {
      for (const e of errs) {
        const constraints = Object.values(e.constraints ?? {});
        if (constraints.length > 0) {
          reasons.push(`${prefix}${e.property}: ${constraints.join('; ')}`);
        } else if (e.children?.length) {
          collect(e.children, `${prefix}${e.property}.`);
        } else {
          reasons.push(`${prefix}${e.property}: invalid`);
        }
      }
    }
    collect(errors, '');
    return { ok: false, error: reasons.join(' | ') };
  }
  return { ok: true, value: instance as Record<string, unknown> };
}

function isPlainObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}
