-- §Phase 8 Content & media: admin-curated homepage sections.
-- `key` is closed by CHECK so adding a section requires a migration here plus
-- a class-validator config schema in src/modules/content/section-schemas.ts.

CREATE TABLE "homepage_sections" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "homepage_sections_key_allowed" CHECK (
      "key" IN (
        'hero', 'featured_products', 'featured_characters',
        'trending_anime', 'collections', 'banner', 'testimonials'
      )
    )
);

CREATE UNIQUE INDEX "homepage_sections_key_key" ON "homepage_sections"("key");

-- Sensible storefront defaults; deterministic ids keep re-runs idempotent
-- (ON CONFLICT DO NOTHING preserves admin edits made after first deploy).
INSERT INTO "homepage_sections" ("id", "key", "is_visible", "sort_order", "config") VALUES
  ('8f1a0a01-0000-4000-8000-000000000001', 'hero', true, 10,
   '{"title":"Own the legend","subtitle":"Official-grade anime apparel, figures and prints — shipped from the Hidden Leaf.","imageUrl":"/naruto.png","ctaLabel":"Shop now","ctaHref":"/products"}'),
  ('8f1a0a01-0000-4000-8000-000000000002', 'featured_products', true, 20,
   '{"productSlugs":["naruto-rasengan-hoodie","sasuke-chidori-hoodie","itachi-akatsuki-hoodie"]}'),
  ('8f1a0a01-0000-4000-8000-000000000003', 'featured_characters', true, 30,
   '{"items":[{"name":"Naruto Uzumaki","slug":"naruto","imageUrl":"/naruto-default.png","tagline":"Number one hyperactive ninja"},{"name":"Sasuke Uchiha","slug":"sasuke","imageUrl":"/sasuke-default.png","tagline":"Avenger of the Uchiha"},{"name":"Kurama","slug":"kurama","imageUrl":"/kurama.png","tagline":"The Nine-Tails"}]}'),
  ('8f1a0a01-0000-4000-8000-000000000004', 'trending_anime', true, 40,
   '{"animeSlugs":["naruto","naruto-shippuden"]}'),
  ('8f1a0a01-0000-4000-8000-000000000005', 'collections', true, 50,
   '{"items":[{"title":"Hoodies","href":"/products?category=apparel&tag=hoodie","imageUrl":"/naruto.png"},{"title":"Tees","href":"/products?category=apparel&tag=t-shirt","imageUrl":"/sasuke-default.png"},{"title":"Posters & Prints","href":"/products?category=posters","imageUrl":"/minato.png"}]}'),
  ('8f1a0a01-0000-4000-8000-000000000006', 'banner', true, 60,
   '{"title":"Hidden Leaf Sale","message":"20% off every Shippuden drop this week only.","ctaLabel":"Browse deals","ctaHref":"/products?sort=newest"}'),
  ('8f1a0a01-0000-4000-8000-000000000007', 'testimonials', true, 70,
   '{"items":[{"quote":"The Rasengan hoodie is the best-made anime merch I have ever owned.","author":"Sakura H."},{"quote":"Shipped fast, prints are crisp, sizing is spot on.","author":"Sai T."}]}')
ON CONFLICT ("key") DO NOTHING;
