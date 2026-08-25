-- Follow-up to 20260823200000_homepage_sections and the /public regrouping.
--
-- 1. 'madara' joins the closed section-key allowlist (the MadaraSpecialCard
--    imagery becomes admin-editable via the content module) and gets its
--    default row, continuing the deterministic-id pattern.
-- 2. The frontend moved /public art into characters/, sections/ and brand/
--    subfolders. Every stored URL pointing at an old flat path is rewritten:
--    taxonomy imagery, product imagery, and any homepage_sections config that
--    references the moved assets. Seed upserts intentionally use update:{},
--    so existing databases are corrected here rather than by re-seeding.
--
-- Every rewrite below is exact-match (full quoted token for JSONB), so the
-- statements are idempotent: a second run changes nothing.

ALTER TABLE "homepage_sections" DROP CONSTRAINT "homepage_sections_key_allowed";

ALTER TABLE "homepage_sections" ADD CONSTRAINT "homepage_sections_key_allowed" CHECK (
  "key" IN (
    'hero', 'featured_products', 'featured_characters',
    'trending_anime', 'collections', 'banner', 'testimonials', 'madara'
  )
);

-- created_at/updated_at are supplied explicitly: the DEFAULT on updated_at
-- was intentionally dropped by 20260823134739_shinobi_store (Prisma manages
-- @updatedAt client-side), so raw SQL inserts must provide both columns.
INSERT INTO "homepage_sections" ("id", "key", "is_visible", "sort_order", "config", "created_at", "updated_at") VALUES
  ('8f1a0a01-0000-4000-8000-000000000008', 'madara', true, 55, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- ── taxonomy imagery ─────────────────────────────────────────────────────────

UPDATE "animes" SET "image_url" = '/characters/naruto.png' WHERE "image_url" = '/naruto.png';
UPDATE "animes" SET "image_url" = '/characters/kurama.png' WHERE "image_url" = '/kurama.png';

UPDATE "characters" SET "image_url" = '/characters/naruto-default.png' WHERE "image_url" = '/naruto-default.png';
UPDATE "characters" SET "image_url" = '/characters/sasuke-default.png' WHERE "image_url" = '/sasuke-default.png';
UPDATE "characters" SET "image_url" = '/characters/minato.png'         WHERE "image_url" = '/minato.png';
UPDATE "characters" SET "image_url" = '/characters/kurama.png'         WHERE "image_url" = '/kurama.png';
UPDATE "characters" SET "image_url" = '/characters/itachi-default.png' WHERE "image_url" = '/itachi-default.png';
UPDATE "characters" SET "image_url" = '/characters/madara-default.png' WHERE "image_url" = '/madara-default.png';
UPDATE "characters" SET "image_url" = '/characters/obito-default.png'  WHERE "image_url" = '/obito-default.png';
UPDATE "characters" SET "image_url" = '/characters/pain.png'           WHERE "image_url" = '/pain.png';

-- ── product imagery ──────────────────────────────────────────────────────────

UPDATE "product_images" SET "url" = '/characters/naruto-rasengan.png'  WHERE "url" = '/naruto-rasengan.png';
UPDATE "product_images" SET "url" = '/characters/naruto-default.png'   WHERE "url" = '/naruto-default.png';
UPDATE "product_images" SET "url" = '/characters/sasuke-chidori.png'   WHERE "url" = '/sasuke-chidori.png';
UPDATE "product_images" SET "url" = '/characters/sasuke-default.png'   WHERE "url" = '/sasuke-default.png';
UPDATE "product_images" SET "url" = '/characters/itachi-default.png'   WHERE "url" = '/itachi-default.png';
UPDATE "product_images" SET "url" = '/characters/itachi-mangekyou.png' WHERE "url" = '/itachi-mangekyou.png';
UPDATE "product_images" SET "url" = '/characters/madara-default.png'   WHERE "url" = '/madara-default.png';
UPDATE "product_images" SET "url" = '/characters/madara-six-paths.png' WHERE "url" = '/madara-six-paths.png';
UPDATE "product_images" SET "url" = '/characters/obito-default.png'    WHERE "url" = '/obito-default.png';
UPDATE "product_images" SET "url" = '/characters/minato.png'           WHERE "url" = '/minato.png';
UPDATE "product_images" SET "url" = '/characters/pain.png'             WHERE "url" = '/pain.png';
UPDATE "product_images" SET "url" = '/characters/kurama.png'           WHERE "url" = '/kurama.png';
UPDATE "product_images" SET "url" = '/characters/naruto.png'           WHERE "url" = '/naruto.png';
UPDATE "product_images" SET "url" = '/sections/kunai.svg'              WHERE "url" = '/kunai.svg';
UPDATE "product_images" SET "url" = '/sections/sky.webp'               WHERE "url" = '/sky.webp';
UPDATE "product_images" SET "url" = '/sections/mountain.webp'          WHERE "url" = '/mountain.webp';

-- ── admin-curated homepage configs (hero / featured_characters / collections)
-- Token replacement on the JSON text: only fully-quoted URL values match, so
-- config keys and surrounding structure are untouched.
UPDATE "homepage_sections"
SET "config" = (
  replace(replace(replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(replace(replace(replace(
    "config"::text,
    '"/naruto.png"',            '"/characters/naruto.png"'),
    '"/kurama.png"',            '"/characters/kurama.png"'),
    '"/naruto-default.png"',    '"/characters/naruto-default.png"'),
    '"/sasuke-default.png"',    '"/characters/sasuke-default.png"'),
    '"/minato.png"',            '"/characters/minato.png"'),
    '"/itachi-default.png"',    '"/characters/itachi-default.png"'),
    '"/madara-default.png"',    '"/characters/madara-default.png"'),
    '"/obito-default.png"',     '"/characters/obito-default.png"'),
    '"/pain.png"',              '"/characters/pain.png"'),
    '"/naruto-rasengan.png"',   '"/characters/naruto-rasengan.png"'),
    '"/sasuke-chidori.png"',    '"/characters/sasuke-chidori.png"'),
    '"/itachi-mangekyou.png"',  '"/characters/itachi-mangekyou.png"'),
    '"/madara-six-paths.png"',  '"/characters/madara-six-paths.png"'),
    '"/kunai.svg"',             '"/sections/kunai.svg"'),
    '"/sky.webp"',              '"/sections/sky.webp"'),
    '"/mountain.webp"',         '"/sections/mountain.webp"')
)::jsonb;
