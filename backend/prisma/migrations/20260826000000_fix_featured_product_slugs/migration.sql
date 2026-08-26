-- Update featured_products section to reference new figure slugs
-- (formerly hoodie products, now collectible figures).
UPDATE "homepage_sections"
SET "config" = jsonb_set(
  "config",
  '{productSlugs}',
  '["naruto-rasengan-figure","sasuke-chidori-figure","itachi-mangekyou-figure"]'::jsonb
)
WHERE "key" = 'featured_products'
  AND "config"->'productSlugs' ? 'naruto-rasengan-hoodie';
