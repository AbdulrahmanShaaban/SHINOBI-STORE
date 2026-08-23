/*
  Warnings:

  - You are about to drop the column `actor_type` on the `inventory_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `actor_type` on the `order_events` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_user_id_fkey";

-- DropIndex
DROP INDEX "products_name_trgm_idx";

-- DropIndex
DROP INDEX "products_search_idx";

-- AlterTable
ALTER TABLE "cart_items" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "carts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "homepage_sections" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_transactions" DROP COLUMN "actor_type",
ADD COLUMN     "actorType" "event_actor" NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE "order_events" DROP COLUMN "actor_type",
ADD COLUMN     "actorType" "event_actor" NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webhook_events" ALTER COLUMN "received_at" SET DATA TYPE TIMESTAMP(3);
