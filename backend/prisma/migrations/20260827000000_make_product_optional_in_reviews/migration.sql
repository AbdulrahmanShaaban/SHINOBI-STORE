-- AlterTable: Make productId optional in reviews table
ALTER TABLE "reviews" ALTER COLUMN "product_id" DROP NOT NULL;

-- DropExisting: Remove the unique constraint that included productId
-- (PostgreSQL NULL semantics mean NULL != NULL, so the constraint wouldn't enforce
-- uniqueness for general reviews anyway)
DROP INDEX IF EXISTS "reviews_user_id_product_id_key";
