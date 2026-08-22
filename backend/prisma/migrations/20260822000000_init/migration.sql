-- Shinobi Store — initial schema: identity (§10.1) + catalog (§10.2) + media slice.
-- Extensions are created first because citext is used by users.email below.

CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('customer', 'content_manager', 'order_manager', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "media_folder" AS ENUM ('products', 'characters', 'hero', 'banners', 'collections', 'general');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'customer',
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animes" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "animes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "anime_id" UUID,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "anime_id" UUID,
    "character_id" UUID,
    "status" "product_status" NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "price_from_cents" INTEGER,
    "search" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "product_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("product_id","tag_id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "option_size" TEXT,
    "option_color" TEXT,
    "price_cents" INTEGER NOT NULL,
    "compare_at_price_cents" INTEGER,
    "stock_on_hand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "weight_grams" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "media_id" UUID,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "review_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_entries" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'cloudinary',
    "public_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "folder" "media_folder" NOT NULL DEFAULT 'general',
    "alt_text" TEXT,
    "uploaded_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "animes_slug_key" ON "animes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "characters_slug_key" ON "characters"("slug");

-- CreateIndex
CREATE INDEX "characters_anime_id_idx" ON "characters"("anime_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_status_featured_idx" ON "products"("status", "featured");

-- CreateIndex
CREATE INDEX "products_status_price_from_cents_idx" ON "products"("status", "price_from_cents");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_anime_id_idx" ON "products"("anime_id");

-- CreateIndex
CREATE INDEX "products_character_id_idx" ON "products"("character_id");

-- CreateIndex
CREATE INDEX "products_rating_avg_idx" ON "products"("rating_avg");

-- CreateIndex
CREATE INDEX "product_tags_tag_id_idx" ON "product_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_is_active_idx" ON "product_variants"("is_active");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_status_idx" ON "reviews"("product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_product_id_key" ON "reviews"("user_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_entries_public_id_key" ON "media_entries"("public_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "animes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "animes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_entries" ADD CONSTRAINT "media_entries_uploaded_by_admin_id_fkey" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ----- Search (tsvector) -----
-- products.search is maintained by triggers rather than a generated column:
-- generated columns may only reference their own row, but the vector must
-- include tag/anime/character names from related tables.
-- Weights: A = name · B = anime/character/tags · C = description.

CREATE OR REPLACE FUNCTION "shinobi_product_search"(p "products") RETURNS tsvector
LANGUAGE sql STABLE AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce((
      SELECT string_agg(x.name, ' ')
      FROM (
        SELECT a.name AS name FROM "animes" a WHERE a.id = p.anime_id
        UNION ALL
        SELECT c.name FROM "characters" c WHERE c.id = p.character_id
        UNION ALL
        SELECT t.name FROM "product_tags" pt JOIN "tags" t ON t.id = pt.tag_id WHERE pt.product_id = p.id
      ) x
    ), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(p.description, '')), 'C')
$$;

CREATE OR REPLACE FUNCTION "products_search_before_write"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."search" := "shinobi_product_search"(NEW);
  RETURN NEW;
END $$;

CREATE TRIGGER "products_search_before_write_trg"
BEFORE INSERT OR UPDATE OF "name", "description", "anime_id", "character_id", "category_id"
ON "products"
FOR EACH ROW EXECUTE FUNCTION "products_search_before_write"();

CREATE OR REPLACE FUNCTION "product_tags_search_sync"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE pid UUID := COALESCE(NEW."product_id", OLD."product_id");
BEGIN
  UPDATE "products" SET "search" = "shinobi_product_search"("products") WHERE "id" = pid;
  RETURN NULL;
END $$;

CREATE TRIGGER "product_tags_search_sync_trg"
AFTER INSERT OR DELETE OR UPDATE OF "product_id", "tag_id"
ON "product_tags"
FOR EACH ROW EXECUTE FUNCTION "product_tags_search_sync"();

-- Anime/character renames refresh dependent vectors (admin-rare events).
CREATE OR REPLACE FUNCTION "animes_search_sync"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "products" SET "search" = "shinobi_product_search"("products") WHERE "anime_id" = NEW."id";
  RETURN NULL;
END $$;

CREATE TRIGGER "animes_search_sync_trg"
AFTER UPDATE OF "name" ON "animes"
FOR EACH ROW EXECUTE FUNCTION "animes_search_sync"();

CREATE OR REPLACE FUNCTION "characters_search_sync"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "products" SET "search" = "shinobi_product_search"("products") WHERE "character_id" = NEW."id";
  RETURN NULL;
END $$;

CREATE TRIGGER "characters_search_sync_trg"
AFTER UPDATE OF "name" ON "characters"
FOR EACH ROW EXECUTE FUNCTION "characters_search_sync"();

-- ----- price_from_cents maintenance -----

CREATE OR REPLACE FUNCTION "product_variants_price_sync"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE pid UUID := COALESCE(NEW."product_id", OLD."product_id");
BEGIN
  UPDATE "products" SET "price_from_cents" = (
    SELECT MIN("price_cents") FROM "product_variants"
    WHERE "product_id" = pid AND "is_active"
  ) WHERE "id" = pid;
  RETURN NULL;
END $$;

CREATE TRIGGER "product_variants_price_sync_trg"
AFTER INSERT OR DELETE OR UPDATE OF "product_id", "price_cents", "is_active"
ON "product_variants"
FOR EACH ROW EXECUTE FUNCTION "product_variants_price_sync"();

-- ----- Integrity extras -----

-- Variant option identity treats NULL as "" so two "Default" variants for one
-- product cannot coexist (a plain UNIQUE would allow duplicates via NULL != NULL).
CREATE UNIQUE INDEX "product_variants_option_identity_key"
ON "product_variants" ("product_id", COALESCE("option_size", ''), COALESCE("option_color", ''));

-- Exactly one primary image per product.
CREATE UNIQUE INDEX "product_images_primary_key"
ON "product_images" ("product_id") WHERE "is_primary";

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_price_cents_check" CHECK ("price_cents" >= 0),
  ADD CONSTRAINT "product_variants_compare_at_price_cents_check" CHECK ("compare_at_price_cents" IS NULL OR "compare_at_price_cents" >= 0),
  ADD CONSTRAINT "product_variants_stock_on_hand_check" CHECK ("stock_on_hand" >= 0),
  ADD CONSTRAINT "product_variants_reserved_check" CHECK ("reserved" >= 0);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range_check" CHECK ("rating" BETWEEN 1 AND 5);

-- Fuzzy name lookup groundwork (Phase 3 search): trigram GIN on product names.
CREATE INDEX "products_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops);

-- Full-text GIN on the maintained vector.
CREATE INDEX "products_search_idx" ON "products" USING gin ("search");