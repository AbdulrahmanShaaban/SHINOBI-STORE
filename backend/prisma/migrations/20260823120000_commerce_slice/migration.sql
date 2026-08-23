-- §10.3 Commerce slice: orders, payments, coupons, inventory audit.
-- Money integrity is enforced at the DB level: total_cents > 0, quantities > 0.

CREATE TYPE "order_status" AS ENUM ('pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE "event_actor" AS ENUM ('system', 'customer', 'admin');
CREATE TYPE "coupon_type" AS ENUM ('percent', 'fixed');
CREATE TYPE "payment_provider" AS ENUM ('stripe');
CREATE TYPE "payment_status" AS ENUM ('requires_payment_method', 'requires_action', 'processing', 'succeeded', 'failed', 'canceled', 'refunded');
CREATE TYPE "refund_status" AS ENUM ('pending', 'succeeded', 'failed');
CREATE TYPE "inventory_tx_type" AS ENUM ('reserve', 'sell', 'release', 'restock', 'adjust');

-- Collision-free SS-YYYY-NNNNNN order numbers.
CREATE SEQUENCE "order_number_seq" START 100001;

CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "user_id" UUID,
    "status" "order_status" NOT NULL DEFAULT 'pending_payment',
    "subtotal_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "shipping_cents" INTEGER NOT NULL DEFAULT 0,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "contact_email" TEXT NOT NULL,
    "shipping_address" JSONB NOT NULL,
    "tracking_number" TEXT,
    "coupon_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "reservation_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_total_positive" CHECK ("total_cents" > 0),
    CONSTRAINT "orders_money_non_negative" CHECK (
      "subtotal_cents" >= 0 AND "discount_cents" >= 0
      AND "shipping_cents" >= 0 AND "tax_cents" >= 0
    )
);

CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "variant_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "image_url" TEXT,
    "unit_price_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "order_items_total_matches" CHECK ("total_cents" = "unit_price_cents" * "quantity")
);

CREATE TABLE "order_events" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "actor_type" "event_actor" NOT NULL DEFAULT 'system',
    "actor_user_id" UUID,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" CITEXT NOT NULL,
    "type" "coupon_type" NOT NULL,
    "value" INTEGER NOT NULL,
    "min_subtotal_cents" INTEGER,
    "max_discount_cents" INTEGER,
    "usage_limit" INTEGER,
    "per_user_limit" INTEGER,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coupons_value_positive" CHECK ("value" > 0)
);

CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "user_id" UUID,
    "discount_cents" INTEGER NOT NULL,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL DEFAULT 'stripe',
    "provider_ref" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "payment_status" NOT NULL DEFAULT 'requires_payment_method',
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_amount_positive" CHECK ("amount_cents" > 0)
);

CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "processing_error" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "provider_ref" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "refund_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refunds_amount_positive" CHECK ("amount_cents" > 0)
);

CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "type" "inventory_tx_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "order_id" UUID,
    "actor_type" "event_actor" NOT NULL DEFAULT 'system',
    "actor_user_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");
-- Sweeper scan path: pending orders past their reservation TTL.
CREATE INDEX "orders_status_reservation_expires_at_idx" ON "orders"("status", "reservation_expires_at");

CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupon_redemptions_coupon_id_idx" ON "coupon_redemptions"("coupon_id");
CREATE INDEX "coupon_redemptions_user_id_idx" ON "coupon_redemptions"("user_id");

CREATE UNIQUE INDEX "payments_provider_ref_key" ON "payments"("provider_ref");
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");

CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");
CREATE INDEX "webhook_events_provider_processed_at_idx" ON "webhook_events"("provider", "processed_at");

CREATE UNIQUE INDEX "refunds_provider_ref_key" ON "refunds"("provider_ref");
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_events_order_id_created_at_idx" ON "order_events"("order_id", "created_at");
CREATE INDEX "inventory_transactions_variant_id_created_at_idx" ON "inventory_transactions"("variant_id", "created_at");
CREATE INDEX "inventory_transactions_order_id_idx" ON "inventory_transactions"("order_id");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_events"
  ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
