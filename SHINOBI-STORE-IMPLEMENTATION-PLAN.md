# SHINOBI STORE — MASTER IMPLEMENTATION PLAN

> **Status:** Blueprint / Source of Truth (no implementation performed yet)
> **Prepared:** August 2026
> **Basis:** Direct inspection of this repository (`frontend/`, `backend/`, configs, dependencies, git history)
> **Audience:** Any engineer or coding agent implementing Shinobi Store phase by phase

---

## 1. Executive Summary

Shinobi Store is a portfolio-grade anime e-commerce platform built as one coherent system:

**Storefront + Headless CMS + Admin CRM**, all served by a single authoritative backend API that any future client (web, mobile) can consume.

**What exists today:**

- A polished, animation-heavy **marketing homepage** (Next.js 16 App Router, React 19, Tailwind v4, GSAP 3.15 + ScrollTrigger, Lenis smooth scroll) with strong visual identity and disciplined `useGSAP` patterns.
- A **throwaway Express + MongoDB scaffold** (~14 source files) that the frontend never calls. It contains critical security flaws (client-supplied payment amounts, mass assignment on admin CRUD, client-computed order totals, default JWT secret fallback) and zero tests.
- No routes beyond `/`. No product pages. No shop. No tests anywhere. No Docker. No CI.

**Core decisions of this plan:**

1. **Keep and extend the frontend foundation.** The design system tokens, GSAP architecture, Lenis integration, and component discipline are worth preserving.
2. **Replace the Express/MongoDB backend** with a **NestJS modular monolith on PostgreSQL + Prisma**. The existing backend has no consumers, no tests, and designs that fight relational integrity (embedded order items, single stock counter). Replacement cost is lowest *now* and rises every phase.
3. **Reorder phases by dependency**: build the platform/catalog data foundation *before* Product Details, so the flagship experience is backed by real APIs instead of being built twice.
4. **Payments are webhook-authoritative** behind a provider abstraction; inventory is reservation-based with atomic conditional updates; Redis is used only where it earns its place (cache, rate limiting, BullMQ backing).
5. Testing, Docker-for-dev, security, and observability are **continuous workstreams** woven into every phase, with dedicated hardening milestones rather than an afterthought phase at the end.

The result will be a content-driven e-commerce platform: homepage sections editable from the Admin CRM, products/anime/characters managed as real entities, orders flowing through explicit state machines, and every critical business rule enforced server-side.

---

## 2. Current Repository Assessment

### 2.1 Repository shape

| Aspect | Finding |
|---|---|
| Structure | pnpm workspace monorepo: `frontend/` + `backend/` (root scripts recurse dev/build/start) |
| Frontend | Next.js **16.2.7** (App Router, Turbopack), React **19.2.4**, TypeScript strict |
| Styling | Tailwind CSS **v4** (CSS-first via PostCSS plugin), design tokens as CSS variables in `globals.css` |
| Animation | GSAP **3.15** + `@gsap/react` 2.1.2 + ScrollTrigger; Lenis 1.3.23 (desktop only); Zustand 5 for cart state |
| Backend | Express 4 + Mongoose 8 (MongoDB), Stripe SDK v14, Cloudinary v1, JWT, bcryptjs, multer, helmet, express-validator (declared, unused in inspected routes) |
| Tests | **None** (frontend or backend) |
| CI/CD | **None** |
| Docker | **None** |
| Env/config | `.env.example` only in backend; frontend has none needed yet |

### 2.2 Frontend findings

- Single route `app/page.tsx`: HeroSection → CardStack → ChooseShinobi → ShinobiCharacterCards → MadaraSpecialCard → QuoteSection → CharacterShowcase → StoreFooter. All content **hardcoded**.
- `ShinobiCharacterCards.tsx` embeds a hardcoded `CHARACTERS` array including prices — these are marketing cards, not real products. There is no product entity in the frontend at all.
- Cart: zustand store defined inline in `components/shared/Cart.tsx`. Client-memory only (no persistence), items lack variant dimensions (size/color exist in backend Order model but not cart).
- GSAP discipline is genuinely good and must be preserved:
  - `useGSAP` from `@gsap/react` everywhere (auto cleanup via context revert).
  - `gsap.matchMedia()` used for responsive variants (e.g., mobile per-card ScrollTriggers vs desktop pinned timelines).
  - Lenis ↔ ScrollTrigger sync done correctly (`lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker`), disabled on touch widths, with proper teardown.
  - `CustomCursor` uses `quickSetter`/`quickTo` appropriately.
- Design tokens (`globals.css`): bg `#0A0A0F`, surfaces `#12121A`/`#16161F`, primary orange `#FF6B00`, red `#CC0000`, gold `#FFB800`, muted `#6B6B80`; fonts Anton/Bebas Neue/Cinzel/Inter via `next/font`.
- Global layout mounts `SmoothScroll`, `ScrollRefresh`, `CustomCursor`, `LoadingScreen`, `Navbar` around every page — fine for storefront, but the future `/admin` area must opt out of marketing chrome (cursor, loading screen).
- Hygiene issues: `deverr.log` / `devout.log` committed noise; `.playwright-mcp/` directory untracked; `ShinobiAfterMadaraSection.tsx` appears unused by `page.tsx`.

### 2.3 Backend findings (Express skeleton)

Files: `server.ts`, `config/database.ts`, `models/{Product,User,Order}.ts`, `routes/{index,auth,products,orders,stripe,upload}.ts`, `middleware/auth.ts`, `utils/cloudinary.ts`.

Verified defects (these justify replacement, not patching):

1. **Client-priced payments** — `POST /stripe/create-payment-intent` takes `amount` from the request body. Anyone can pay $0.01.
2. **Client-computed order totals** — `POST /orders` persists raw `req.body` (including `total`) plus `userId`. No server-side price resolution, no inventory interaction.
3. **Mass assignment** — admin product create/update passes `req.body` straight into Mongoose; order status patch accepts arbitrary strings.
4. **Webhook does nothing** — signature verified but events only `console.log`; no order linkage, no idempotency record.
5. **Auth weaknesses** — JWT secret falls back to a hardcoded default; `isAdmin` is a claim inside a 7-day token with no revocation; no refresh; no rate limiting.
6. **No transactions** — Mongo embedded-item model with single `stock` number cannot express reservation/release safely under concurrency without significant rework.
7. **Referenced seed script missing** — `package.json` calls `src/scripts/seed.ts`; file doesn't exist.
8. Zero validation usage despite `express-validator` dependency; zero tests; no pagination on list endpoints.

**Consumers today: none.** The frontend never calls the API. This makes migration low-risk: there is nothing to keep compatible with.

### 2.4 What inspection changes about the original phase sketch

Building "Phase 1: Product Details" against the Express/Mongo skeleton would mean building it twice — once against throwaway APIs, then re-plumbing to NestJS. Inspection therefore justifies moving **platform + catalog foundation ahead of Product Details**, and pulling Docker-for-development forward (NestJS development needs PostgreSQL + Redis from day one).

---

## 3. Goals

1. One authoritative backend API (NestJS modular monolith) serving storefront, admin CRM, and future clients.
2. Real product domain: `/products/[slug]` SEO-friendly routes with the cinematic GSAP transition experience already prototyped on the homepage.
3. Shop page with Amazon-level information architecture (search/filter/sort/pagination, URL-driven state) in Shinobi Store's visual identity.
4. Content-driven homepage: hero and sections configurable from the Admin CRM, not hardcoded JSX.
5. Correct commerce core: server-priced checkout, reservation-based inventory that cannot oversell, explicit order/payment state machines, Stripe-first payments behind a provider abstraction.
6. Admin CRM ("Shinobi Store Management") covering products, orders, customers, inventory, reviews, coupons, content, media, settings — RBAC-gated.
7. Security posture: session auth with revocation, centralized RBAC, validation everywhere, rate limiting, audit logs, hardened uploads/webhooks.
8. Engineering quality: unit/integration/E2E suites incl. failure paths, structured logging + metrics + error tracking, CI pipeline, reproducible local dev via Docker.
9. Preserve and systematize the existing GSAP/Lenis motion language with documented ownership and reduced-motion strategy.

## 4. Non-Goals

1. **No microservices.** One deployable NestJS app. Service separation would add operational cost with no requirement driving it.
2. **No multi-vendor marketplace**, no seller accounts, no payouts. Single-store operator model.
3. **No real-money production launch commitment** — Stripe stays in test mode unless explicitly decided later; compliance scope (PCI) is minimized by using Stripe-hosted/tokenized flows.
4. **No Elasticsearch/Meilisearch/Kafka/Kubernetes** — none justified at catalog/traffic scale (see §18 Search).
5. **No complex DAM** — Media Library stays a simple categorized Cloudinary-backed library.
6. **No mobile app in scope** — but the API contract (REST, cookie-or-bearer auth) must not preclude one.
7. **No i18n/multi-currency** v1 (schema keeps currency column for later).
8. **No Framer Motion / Three.js** — GSAP covers all identified motion needs; WebGL is not a requirement.
9. **No premature abstraction**: no repository-pattern ceremony inside Prisma services, no event-sourcing, no CQRS. Straightforward NestJS services + Prisma.

---

## 5. Architecture

### 5.1 System overview

```
                    ┌──────────────────────────────────────────────┐
                    │                 Browser                      │
                    └───────┬───────────────────────┬──────────────┘
                            │                       │
              ┌─────────────▼──────────┐   ┌────────▼─────────────┐
              │  Next.js 16 (frontend) │   │   Future clients     │
              │  - Storefront (RSC)    │   │   (mobile: REST)     │
              │  - Admin CRM (/admin)  │   └────────┬─────────────┘
              └─────────────┬──────────┘            │
                            │  HTTPS, JSON, /api/v1  │
                            │  httpOnly session cookie│
                            ▼                        ▼
              ┌───────────────────────────────────────────────┐
              │        NestJS API — MODULAR MONOLITH           │
              │  Auth │ Catalog │ Cart │ Orders │ Payments     │
              │  Inventory │ Reviews │ Coupons │ Content       │
              │  Media │ Notifications │ Admin │ Health        │
              └──────┬──────────────┬───────────────┬─────────┘
                     │ Prisma       │ ioredis       │ HTTPS
                     ▼              ▼               ▼
               ┌───────────┐  ┌───────────┐  ┌─────────────────┐
               │ PostgreSQL│  │  Redis    │  │ Stripe API      │
               │ (data)    │  │ cache ·   │  │ Cloudinary API  │
               └───────────┘  │ ratelimit │  │ SMTP provider   │
                              │ BullMQ    │  └─────────────────┘
                              └─────┬─────┘
                                    │ BullMQ workers (same image,
                                    │ separate process)
                                    ▼
                          email · media processing ·
                          reservation sweeper · payment reconciliation
```

### 5.2 Architectural principles

1. **Modular monolith.** One NestJS application with strictly bounded modules. Modules communicate through exported services and clear dependency direction; never by reaching into another module's Prisma tables directly.
2. **The backend is authoritative.** Prices, totals, discounts, stock, roles, permissions, order state, payment state are computed and enforced server-side. The frontend renders; it does not decide.
3. **Dependency direction:** Controllers → Services → Prisma/Redis/adapters. Domain logic never imports from controllers. Cross-module use goes through the owning module's public service (e.g., `OrdersService` calls `InventoryService`, not `prisma.variant.update` directly).
4. **One system, three faces:** storefront routes, `/admin` route group, and the REST API are separate surfaces over shared domain modules.
5. **Failure-aware boundaries:** every call crossing a process boundary (Stripe, Cloudinary, SMTP) has an explicit timeout, error strategy, and idempotency story (§13).

### 5.3 Bounded contexts

| Context | Owns | Notes |
|---|---|---|
| Identity | users, sessions, RBAC | No business logic beyond identity |
| Catalog | products, variants, images, anime, characters, categories, tags, reviews(read model) | Public read + admin write |
| Cart | carts, cart items | Guest cart client-side; server cart post-auth |
| Orders & Payments | orders, items, payments, webhooks, refunds, coupons(redemption) | The transactional heart |
| Inventory | stock on hand/reserved, inventory transactions | Consumed by orders/admin |
| Content | homepage sections, hero configs, banners | Headless-CMS slice |
| Media | media library records, upload orchestration | Storage behind interface (Cloudinary v1) |
| Platform | health, audit logs, notifications dispatch | Cross-cutting |

---

## 6. Technology Decisions

Each decision: purpose → why → alternatives considered → complexity introduced.

### 6.1 Keep: Next.js 16 App Router + React 19 + TypeScript strict

- **Purpose:** Storefront + admin UI in one app; RSC for data-driven pages.
- **Why keep:** Already at latest major versions with a working build; rewriting to anything else destroys working value for zero requirement.
- **Alternatives:** Remix/React Router 7, Astro — none solve an actual problem here; migrating would be churn.
- **Complexity:** App Router caching semantics changed across majors — Phase 0 must pin down and verify `revalidate`/fetch-tag behavior on the exact installed version (16.2.x), since this affects product-page freshness after admin edits.

### 6.2 Keep: Tailwind CSS v4 (CSS-first)

- **Why:** Already configured via `@tailwindcss/postcss`; tokens already live as CSS variables. Formalize tokens into `@theme` so utilities like `bg-primary` exist instead of arbitrary values (`bg-[#FF6B00]` appears throughout components today).
- **Alternatives:** CSS Modules/styled-components — regression, no benefit.
- **Complexity:** Minimal; v4 is config-less by design.

### 6.3 Replace backend: Express+MongoDB → **NestJS + PostgreSQL + Prisma**

- **Purpose:** Authoritative typed API with real transactions/constraints for orders, payments, inventory.
- **Why replace rather than fix:** Every defect in §2.3 is structural, not incidental. Mongo's embedded-order document fights normalized inventory reservation and relational reporting; the codebase is ~14 files with no tests and no consumers, so total replacement is cheaper than retrofitting correctness. NestJS provides enforced module structure, DI, guards/interceptors/pipes (validation, RBAC, rate limiting, logging), and first-class testing ergonomics — matching what the global engineering rules demand of an authoritative commerce backend.
- **Alternatives:** (a) Patch Express — fastest short-term, but permanently re-implementing framework concerns (validation, guards, lifecycle) by hand; (b) tRPC — couples mobile-future client to TypeScript; (c) Fastify+NestJS adapter — possible later, adapter-level swap doesn't change app code materially.
- **Complexity introduced:** A second service to run/deploy; mitigated by Docker Compose dev infra and one deploy target (Railway/Fly or VPS container).
- **HTTP layer:** Default Express adapter (Nest 11). Stripe webhook route must receive the **raw body** for signature verification — mounted before the global JSON parser.

### 6.4 PostgreSQL + Prisma

- **Purpose:** Relational integrity (FKs, unique/CHECK constraints, transactions, row locking) for money and stock.
- **Why:** Order/inventory/payment invariants belong in the database, not only in services (global rules §12). Reporting queries (revenue, top products) become ordinary SQL.
- **Alternatives:** MongoDB — rejected above; MySQL — equivalent but Postgres adds FTS + trigram search natively (§18).
- **Complexity:** Migrations discipline required (`prisma migrate` in CI, applied on deploy); Alpine images need correct Prisma `binaryTargets`.

### 6.5 Redis (+ ioredis)

- **Legitimate uses only** (see §16): response caching with invalidation, rate limiting, session lookup cache, BullMQ backing. Not used as primary store for anything that must survive restarts.

### 6.6 BullMQ

- **Purpose:** Background jobs that must not block requests or must survive crashes: emails, media processing, reservation sweeping, payment reconciliation.
- **Why:** These jobs *will* be needed by Phases 6–8; BullMQ gives retries/DLQ/visibility on Redis we already run.
- **Alternatives:** node-cron (no retry/durability), pg-boss (fine, but splits job infrastructure across two stores).
- **Complexity:** Worker process to operate; acceptable and portfolio-relevant.

### 6.7 Keep GSAP ecosystem; add Flip/SplitText where justified

- GSAP 3.15 includes formerly premium plugins free (Flip, SplitText, etc.) — available under current version.
- `@gsap/react` `useGSAP` stays the React integration standard (already the house style).
- Lenis stays as the smooth-scroll layer (already correctly wired to ScrollTrigger).

### 6.8 Testing: Jest + Supertest (API), Vitest or Jest (frontend units), Playwright (E2E)

- Jest is NestJS's default and matches the prompt's stack list; Playwright is already partially present via `.playwright-mcp/` tooling artifacts (dev-only, not test infra).
- Test DB = disposable PostgreSQL instance (Docker), migrations applied per suite run.

### 6.9 Auth: opaque session tokens in DB (Redis-cached), not bare JWT

- **Why:** Revocation ("log out everywhere", ban user, compromised token) is mandatory for an admin CRM; stateless JWT makes revocation ugly (denylists ≈ sessions anyway). Opaque random token, SHA-256 hash stored in `sessions`, delivered as `httpOnly; Secure; SameSite=Lax` cookie for the web client and accepted as `Authorization: Bearer` for future non-browser clients. Same-origin/subdomain deployment keeps cookies same-site.
- **Alternatives:** JWT+refresh rotation — more moving parts for the same guarantees; NextAuth/Auth.js — oriented to Next-as-authority, conflicts with independent-API architecture.
- **Complexity:** A session table + lookup; trivially small.

### 6.10 Payments: Stripe first, behind `PaymentProvider` port

- Provider-agnostic interface (§14) with one concrete Stripe adapter v1. Alternatives (PayPal, local PSPs) become new adapters, not refactors.

### 6.11 Media: Cloudinary v1 behind a storage interface

- Backend-mediated signed uploads; metadata mirrored into `media` table. S3+Bunny/self-hosted transforms remain possible later without touching callers.

### 6.12 Monorepo tooling: keep plain pnpm workspace

- **Why:** Two apps is exactly what pnpm workspaces handles natively. Turborepo/Nx buy remote caching/orchestration that two packages don't need yet. Re-evaluate if a third package appears.
- Shared contract types come from OpenAPI generation (§8.4), which removes most pressure for a shared TS package.

---

## 7. Domain Model

Entity map (relations in parentheses):

```
User ──< Session
User ──< Review >── Product
User ──< Order ──< OrderItem >── ProductVariant >── Product
Order ── Payment ──< Refund          (payment provider refs stored)
Order ──< OrderEvent                (timeline)
Coupon ──< CouponRedemption >── Order
Product >── Category (self-nesting allowed)
Product >── Anime ; Product >── Character >── Anime
Product >──< Tag
ProductVariant ── InventoryTransaction (audit of every stock movement)
Product ──< ProductImage >── Media
HomepageSection (config JSONB, ordered, visible flag)
MediaLibraryEntry (upload metadata, folder taxonomy)
AuditLog (actor → action → entity, insert-only)
Notification (queued email/notification record)
```

Key modeling decisions:

1. **Price lives on `ProductVariant`, not `Product`.** Every product has ≥1 variant (a "Default" variant when size/color don't apply). This makes inventory-per-variant uniform and prevents "product price ≠ variant price" drift. Money stored as integer **cents** (`priceCents`), never floats.
2. **Orders snapshot everything they need** (name, sku, unit price, image URL onto `order_items`). Catalog edits/deletes can't mutate financial history. FK to variant is `RESTRICT`.
3. **Anime/Character are first-class filterable entities**, not tags — the shop's IA depends on faceting by them (§9 of prompt requirements).
4. **Reviews denormalize `ratingAvg`/`reviewCount` onto Product** (updated in the same transaction as review approval) so listing sort-by-rating needs no joins/aggregations.
5. **Content sections use typed JSONB configs validated by DTO schemas per section type** — one `homepage_sections` table instead of parallel per-section tables (explicit simplification vs the prompt's suggested `hero_configs`; a hero *is* a section with a config schema).
6. **Soft-delete only where history matters** (users). Products archive instead of delete if referenced by orders.

---

## 8. Frontend Architecture

### 8.1 Route map (App Router)

```
app/
  layout.tsx                  # fonts, globals; minimal chrome only
  (storefront)/
    page.tsx                  # home — CMS-driven sections
    products/
      page.tsx                # shop: filters/sort/search/pagination (URL state)
      [slug]/page.tsx         # PRODUCT DETAILS (generateStaticParams optional;
                              #  revalidate/tag-based invalidation after admin edits)
    checkout/
      page.tsx                # address + review + pay (client component island)
      return/page.tsx         # payment return landing; polls real order status
    orders/
      [orderNumber]/page.tsx  # customer order detail w/ animated timeline
    account/
      page.tsx | orders/page.tsx | addresses/page.tsx
    login/page.tsx | register/page.tsx
  (admin)/
    admin/
      layout.tsx              # server-side session+role gate; admin shell chrome
      page.tsx                # dashboard
      products/ … products/[id]/edit/page.tsx
      orders/ … orders/[id]/page.tsx
      customers/page.tsx
      inventory/page.tsx
      categories|anime|characters/page.tsx
      reviews/page.tsx
      coupons/page.tsx
      content/page.tsx        # homepage section editor
      media/page.tsx          # media library
      settings/page.tsx admins/page.tsx audit-log/page.tsx
```

Storefront marketing chrome (`CustomCursor`, `LoadingScreen`, marketing `Navbar`) lives inside `(storefront)` layouts — the admin area opts out deliberately.

### 8.2 Rendering & data flow

- **Server Components fetch the API** through a single typed client (`lib/api/server.ts`) forwarding the session cookie; product/shop/home pages read fresh-enough data via Next caching with explicit revalidate tags (`product:{slug}`, `home-content`). Admin mutations trigger API-side cache-revalidation hooks (webhook-style internal endpoint or short TTLs — decided in Phase 0 after verifying Next 16 semantics).
- **Client Components** own interactivity: gallery, quantity/variant picker, add-to-cart, cart drawer, checkout form, admin tables/forms.
- **State ownership:**
  - Server state → RSC + API.
  - Guest cart + UI state → Zustand (persist middleware for guest cart; existing inline store moves to `lib/store/cart.ts` and gains variants/persistence/hydration safety).
  - Form state → controlled forms (no new form library unless admin complexity proves it necessary).

### 8.3 Component organization

```
components/
  ui/            # Button, Input, Select, Badge, Modal, Skeleton… (design-system primitives)
  product/       # ProductCard, Gallery, VariantPicker, PriceBlock, StockBadge, AddToCartBar
  shop/          # FilterSidebar, SortMenu, Pagination, ActiveFilterChips, MobileFilterSheet
  cart/          # CartDrawer, CartLineItem, CartSummary
  checkout/      # AddressForm, PaymentSection, OrderSummary
  order/         # OrderTimeline (animated), OrderStatusBadge
  admin/         # DataTable, EntityForm, ImageManager, SectionEditor…
  animations/    # Reveal, SplitChars, MagneticButton, PageTransition primitives (thin wrappers)
  sections/      # existing homepage sections, progressively CMS-fed
```

Existing homepage components remain; their hardcoded data gets replaced by CMS content behind the same visual output (Phase 8).

### 8.4 API contract typing

NestJS exposes OpenAPI; `openapi-typescript` generates `packages/contracts/api.d.ts` consumed by the frontend client. CI fails on drift between generated types and committed ones when the spec changes. (Fallback if codegen friction appears: hand-written types + contract tests.)

### 8.5 Responsive & accessibility baselines

- Breakpoints consistent with existing `matchMedia` usage (mobile ≤767px behavior differs today); shop grid collapses sidebar into Filters/Sort sheets.
- Keyboard operability for drawer/gallery/filters; visible focus states; alt text from `ProductImage.altText`; contrast checked against the dark palette; `prefers-reduced-motion` honored globally (§19).

---

## 9. Backend Architecture

### 9.1 Module map (NestJS)

| Module | Responsibility | Key entities | Public APIs (v1) | Depends on |
|---|---|---|---|---|
| **Auth** | register, login, logout, session lifecycle, password reset | Session, User | `POST /auth/register` `POST /auth/login` `POST /auth/logout` `GET /auth/me` `POST /auth/forgot-password` `POST /auth/reset-password` | Users, Redis |
| **Users** | profile, admin customer views | User | `GET/PATCH /users/me`, admin list/detail/ban | Auth |
| **Products** | catalog read + admin CRUD, search/filter/sort/pagination | Product, ProductVariant, ProductImage | `GET /products` `GET /products/:slug` + admin CRUD `POST/PATCH/DELETE /admin/products` | Categories, Anime, Characters, Media |
| **Categories / Anime / Characters / Tags** | taxonomy CRUD (admin) + public read for filters | as named | `GET /categories` etc. + admin CRUD | — |
| **Cart** | server cart for authenticated users; guest merge on login | Cart, CartItem | `GET /cart` `POST /cart/items` `PATCH /cart/items/:id` `DELETE …` `POST /cart/merge` | Products, Inventory (validation) |
| **Inventory** | stock/reserved mutation, adjustments, transaction log | InventoryTransaction (+ columns on variant) | internal service; admin: `GET/POST /admin/inventory/adjustments` | — |
| **Orders** | order creation (the big transaction), state machine, customer/admin views, timeline | Order, OrderItem, OrderEvent | `POST /orders` (idempotent) `GET /orders` `GET /orders/:orderNumber` admin transitions | Cart, Inventory, Coupons, Payments, Notifications |
| **Payments** | PaymentProvider port + Stripe adapter, webhooks, refunds, reconciliation | Payment, WebhookEvent, Refund | `POST /payments/webhook/stripe` (raw body); refunds via admin orders API | Orders |
| **Coupons** | validation at checkout, usage limits | Coupon, CouponRedemption | admin CRUD; applied server-side during order creation | Orders(read) |
| **Reviews** | create/approve/list, rating denormalization | Review | `GET /products/:slug/reviews` `POST …` (purchaser-gated), admin moderation | Products, Orders |
| **Media** | upload orchestration, library CRUD, folder taxonomy | MediaEntry | `POST /admin/media` (multipart) `GET /admin/media` `DELETE …` | storage adapter |
| **Content** | homepage sections/hero config CRUD, published read | HomepageSection | `GET /content/homepage` public; admin CRUD | Media |
| **Notifications** | email dispatch via queue, template rendering, notification records | Notification | internal (queue consumers) | BullMQ |
| **Admin** | dashboard aggregates (revenue, orders, low stock) | read-only queries | `GET /admin/dashboard` | most modules (read paths) |
| **AuditLog** | insert-only trail of privileged actions | AuditLog | `GET /admin/audit-log` | — |
| **Health** | liveness/readiness | — | `/health` `/health/ready` | Prisma, Redis |

Deliberately **not identical CRUD everywhere**: Orders/Payments/Inventory are workflow-heavy services with guarded state transitions; Content is config-shaped; Admin is read-aggregation. Uniformity would be wrong here.

### 9.2 Request pipeline (order matters)

```
Helmet-style headers → CORS (credentialed, allowlist origin)
→ CookieParser → raw-body mount for /payments/webhook/stripe
→ JSON body parser (limited) → RequestContextMiddleware (x-request-id)
→ ValidationPipe(global: whitelist + forbidNonWhitelisted, transform)
→ ThrottlerGuard (Redis store; per-route overrides; webhook exempt)
→ Jwtless SessionGuard (attaches req.user from session cookie/bearer)
→ RolesGuard (@RequirePermissions(...) metadata per route)
→ Controller → Service → Prisma
→ global ExceptionFilter (problem-shaped errors, no stack leakage, Sentry capture)
→ LoggingInterceptor (method, route, status, durationMs, requestId)
```

### 9.3 Error contract

```jsonc
// every error, consistent shape
{ "statusCode": 400, "error": "Bad Request", "message": "…human readable…",
  "code": "VALIDATION_ERROR" /* stable machine code: OUT_OF_STOCK, COUPON_EXPIRED, … */ ,
  "requestId": "req_…" }
```

Frontend keys UX off `code`, not strings.

### 9.4 Business rules worth naming now

- Checkout recomputes everything from DB (variant active? price? coupon? shipping rule) — client cart is a *suggestion*.
- Order creation = one DB transaction: validate cart → lock/reserve inventory → apply coupon (atomic increment w/ limits) → persist order+items+events → create payment row. Any failure rolls back all.
- Only the payment provider's verified success moves an order to paid.
- State transitions are whitelisted per role and recorded as `OrderEvent`s.

---

## 10. Database Design

PostgreSQL via Prisma. Money = integer cents. Timestamps everywhere (`createdAt/updatedAt`). Naming snake_case in DB, camelCase in TS.

### 10.1 Identity & access

```ts
User      id uuid pk · email citext unique · passwordHash · fullName
          role enum(customer, content_manager, order_manager, admin, super_admin) default customer
          phone? · isActive bool default true · deletedAt? (soft delete)
          @@index([role])
Session   id uuid pk · userId fk cascade · tokenHash char(64) unique (sha256 hex)
          userAgent? · ip? · expiresAt · revokedAt? · createdAt
          @@index([userId]) @@index([expiresAt])
PasswordResetToken id · userId fk · tokenHash unique · expiresAt · usedAt?
```

RBAC roles are an enum + centralized permission matrix in code (§11.2). Tables-for-roles rejected until dynamic roles are a real requirement.

### 10.2 Catalog

```ts
Category  id · slug unique · name · parentId? self-fk · sortOrder · isActive
Anime     id · slug unique · name · description? · imageUrl? · isFeatured · sortOrder
Character id · slug unique · name · animeId? fk · description? · imageUrl?
Tag       id · slug unique · name
Product   id · slug unique · name · description · categoryId fk RESTRICT
          animeId? fk · characterId? fk
          status enum(draft, active, archived) default draft
          featured bool default false
          ratingAvg numeric(3,2) default 0 · reviewCount int default 0   // denormalized
          search tsvector (generated: name/description/tags/anime/character) 
          createdAt/UpdatedAt
          @@index([status, featured]) @@index([categoryId]) @@index([animeId])
          @@index([characterId]) @@index([ratingAvg]) GIN(search)
ProductTag productId fk · tagId fk  (composite pk)
ProductVariant id · productId fk cascade · sku unique
          optionSize? · optionColor?           // nullable ⇒ "Default" variant
          priceCents int check >=0 · compareAtPriceCents? int check >=0
          stockOnHand int default 0 check >=0 · reserved int default 0 check >=0
          weightGrams? · isActive bool default true
          unique(productId, optionSize, optionColor)
          @@index([isActive])
ProductImage id · productId fk cascade · mediaId fk set null · url · altText?
          sortOrder · isPrimary bool    // partial unique index: one primary/product
Review   id · productId fk cascade · userId fk restrict · orderItemId? fk null
          rating int check 1..5 · title? · body · status enum(pending,approved,rejected)
          unique(userId, productId)
```

`available = stockOnHand - reserved` is always computed, never stored (can't drift).

### 10.3 Commerce

```ts
Cart      id · userId fk cascade unique (one open cart) · timestamps
CartItem  id · cartId fk cascade · productVariantId fk restrict
          quantity int check >0 · addedPriceCents (display snapshot only)
          unique(cartId, productVariantId)

Order     id · orderNumber text unique (SS-YYYY-NNNNNN)
          userId? fk set null            // guest checkout allowed
          status enum(pending_payment, confirmed, processing,
                      shipped, delivered, cancelled, refunded)
          subtotalCents · discountCents · shippingCents · taxCents · totalCents
            all int, CHECK (total_cents > 0)
          currency char(3) default 'USD'
          contactEmail · shippingAddress jsonb (snapshot, validated DTO shape)
          trackingNumber? · couponId? fk set null
          reservationExpiresAt? timestamptz        // drives sweeper
          @@index([userId]) @@index([status, reservationExpiresAt])
OrderItem id · orderId fk cascade · productVariantId fk RESTRICT
          productName · variantName · sku · imageUrl?      // immutable snapshots
          unitPriceCents · quantity check>0 · totalCents
OrderEvent id · orderId fk cascade · type · fromStatus? · toStatus?
          actorType enum(system, customer, admin) · actorUserId? · message?
          metadata jsonb? · createdAt                       // timeline source of truth
Coupon    id · code citext unique · type enum(percent, fixed) · value
          minSubtotalCents? · maxDiscountCents? · usageLimit? · perUserLimit?
          startsAt? · endsAt? · isActive · timesUsed int default 0
CouponRedemption id · couponId fk · orderId fk · userId? · discountCents
Payment   id · orderId fk restrict · provider enum(stripe) 
          providerRef text unique (PaymentIntent id) · idempotencyKey unique
          amountCents · currency · status enum(requires_payment_method,
          requires_action, processing, succeeded, failed, canceled, refunded)
          failureReason? · timestamps
WebhookEvent id · provider · eventId unique · type · payload jsonb
          receivedAt · processedAt? · processingError?      // dedupe + forensics
Refund    id · paymentId fk · providerRef unique · amountCents · reason? · status
```

### 10.4 Platform

```ts
HomepageSection id · key unique (hero, featured_products, featured_characters,
                trending_anime, collections, banner, testimonials)
                isVisible · sortOrder · config jsonb   // schema validated per `key`
MediaEntry id · provider enum(cloudinary) · publicId unique · url · width · height
           format · bytes · folder enum(products, characters, hero, banners,
           collections, general) · altText? · uploadedByAdminId? fk set null
InventoryTransaction id · variantId fk restrict · type enum(restock, reserve,
           release, sell, adjust, refund_restock) · quantityDelta int
           referenceType? · referenceId? · note? · createdByUserId? · createdAt
           @@index([variantId, createdAt])
AuditLog  id · actorType · actorUserId? · action · entityType · entityId
          diff jsonb? · ip? · userAgent? · createdAt (insert-only)
          @@index([entityType, entityId]) @@index([action, createdAt])
Notification id · userId? · channel enum(email) · type · payload jsonb
             status enum(queued, sent, failed) · error? · sentAt?
```

### 10.5 Concurrency & migration notes

- Inventory mutations are single-statement conditional updates inside transactions (§15) — safe under READ COMMITTED.
- Coupon `timesUsed` increments conditionally (`usageLimit` checked in same UPDATE) inside the order transaction.
- Migrations: `prisma migrate dev` locally; `migrate deploy` in CI/CD gate; destructive changes require two-step (add-new → backfill → drop-old) once real data exists.
- Seed script (real, deterministic): categories/anime/characters, ~24 products across variants with images mapped to existing `public/` art where sensible.

---

## 11. Authentication & Authorization

### 11.1 Authentication design

- Register: email+password (argon2id via `hash-wasm`/`argon2`; bcryptjs acceptable fallback), normalized email, generic responses (no account enumeration).
- Login: verify → create Session → opaque 32-byte random token → SHA-256 stored → cookie `shinobi_session` (`httpOnly; Secure; SameSite=Lax; Path=/`) or returned once for bearer clients.
- Every request: hash incoming token → lookup (Redis cache-first, DB fallback) → attach user if valid/unexpired/unrevoked.
- Logout revokes current session; "logout all" revokes by userId; sessions carry absolute expiry (7d) + sliding renewal window.
- Password reset: single-use hashed tokens, 30-min expiry, rate-limited request endpoint, same generic response whether or not the account exists.
- Login/register/reset throttled per-IP **and** per-identifier (§16).

### 11.2 Authorization design (RBAC without hardcoding)

Permission matrix lives in **one module** (`common/rbac/permissions.ts`):

```ts
const PERMISSIONS = {
  super_admin:      ['*'],
  admin:            ['products:w','orders:*','customers:r','inventory:w',
                     'reviews:w','coupons:w','content:w','media:w','admins:r'],
  content_manager:  ['products:r','content:w','media:w',
                     'categories:w','anime:w','characters:w','reviews:w'],
  order_manager:    ['orders:r','orders:transition','customers:r',
                     'inventory:adjust','refunds:request','coupons:r'],
  customer:         ['orders:own','reviews:create','cart:*','account:w'],
} as const;
```

- Routes declare requirements declaratively: `@RequirePermissions('products:w')`.
- Guards enforce **server-side only**; frontend role checks are UX convenience, never security.
- Ownership checks (`orders:own`) implemented as resource-level guards comparing `order.userId` to session user — prevents IDOR by construction, covered by tests.
- Adding a role = editing the matrix + assigning the enum value; no scattered `if (isAdmin)` anywhere (explicitly banned pattern).

---

## 12. Security Architecture

Threat-driven controls mapped to this codebase:

| Concern | Control |
|---|---|
| AuthN | Argon2id hashes; opaque revocable sessions; no secrets in URLs; generic auth errors |
| AuthZ | Centralized RBAC matrix + route guards + resource-ownership guards; deny by default |
| IDOR/BOLA | Every user-scoped query filters by session user server-side (`orders:own` guard); admin routes behind permission checks — never trust client IDs alone |
| Injection | Prisma parameterizes everything; **no string-built SQL**; if raw SQL is ever needed it uses `$queryRaw` tagged templates only. React escapes output (XSS); admin rich text limited to plain text/markdown rendered safely |
| Mass assignment | `ValidationPipe` whitelist + `forbidNonWhitelisted`; DTOs define writable fields; role/price/stock fields are **never** client-writable on any endpoint |
| CSRF | Cookie is `SameSite=Lax` + all mutations are JSON POST/PATCH/DELETE with custom header requirement via guard for cookie-authed non-GET requests; no classic form posts to API |
| Rate limiting | Redis-backed throttles: auth 5/min/IP+identifier; checkout/order 10/min/user; search 30/min/IP; upload 20/hour/admin; global sane default |
| Uploads | Backend-mediated Cloudinary signed upload; allowlist image mime + magic-byte check; size cap 10 MB; strip/fixed filenames; folder taxonomy from server not client; admin-only surface |
| Webhooks | Stripe signature verification on raw body; event dedupe table; replay-safe handlers |
| Headers | helmet defaults + CSP (frontend via next.config headers: default-src self, img-src self + Cloudinary CDN, script-src self + nonce strategy where needed), HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors none |
| CORS | Credentialed, explicit origin allowlist per env — never `*` with credentials |
| Secrets | `.env` gitignored (already), `.env.example` documents shape; production secrets from platform env store; JWT-default-secret class of bug banned by config validation at boot (fail-fast if missing) |
| Dependencies | pnpm lockfile committed; `pnpm audit --prod` gate in CI (moderate+); dependabot-style updates in dedicated PRs, never mixed into feature work |
| Audit | Insert-only `AuditLog` on every privileged mutation (who/what/diff/when/ip) |
| Enumeration | Uniform timing/messages on login/reset; slugs are non-enumerable UUID-free but public-by-design catalog data |
| Abuse | Checkout requires stockable cart; search cached + throttled; webhook endpoints signature-gated |

**Banned forever (found in current skeleton):** trusting client `amount`, persisting client `total`, `isAdmin` inside a long-lived token without revocation, secret fallback defaults.

---

## 13. Reliability & Failure Handling

The two flows that must never corrupt state:

### 13.1 Order placement — failure matrix

| Failure | Behavior | Recovery |
|---|---|---|
| Double-click / double submit | Client disables button **and** server honors `Idempotency-Key` header: same key returns original order response | Key unique constraint |
| One variant went out of stock mid-checkout | Reservation conditional update fails → whole transaction rolls back → `409 OUT_OF_STOCK` naming the offending item | User adjusts cart |
| DB dies mid-transaction | Atomic rollback; nothing persisted | Retry safe (idempotency key) |
| PaymentIntent created, user abandons | Order stays `pending_payment`; reservation holds until TTL | Sweeper cancels order + releases stock after 30 min |
| Server crash after commit before response | Order exists; idempotent retry returns it | Client retry / support lookup |
| Stripe down at PI creation | Explicit timeout (8 s) + circuit-breaker-ish backoff; order remains pending_payment with payment row `failed`; user may retry payment | Reconciliation job also sweeps these |

### 13.2 Payment confirmation — failure matrix

| Failure | Behavior | Recovery |
|---|---|---|
| Duplicate webhook | `WebhookEvent.eventId` unique → second delivery acked, no state change | — |
| Delayed/reordered webhooks | Transitions guarded by state machine (`succeeded` is terminal; stale events no-op) | — |
| Malformed/forged webhook | Signature fails → 400, logged, alert metric | — |
| Provider succeeded, webhook never arrives (lost) | Frontend success page polls order status; reconciliation job compares local pending payments vs Stripe PI every 15 min and applies truth | Auto-heal or alert |
| Local says paid, provider disagrees | Refund path + audit log; reconciliation flags mismatch | Manual ops runbook |
| Handler crashes mid-webhook | Event row exists with `processingError`; BullMQ retry or manual reprocess; handler itself idempotent | Safe re-run |

### 13.3 General rules

- Every external call (Stripe/Cloudinary/SMTP): explicit timeout, bounded retries only where idempotent, structured failure log.
- Queues carry retries w/ exponential backoff → DLQ → admin visibility.
- Graceful degradation: reviews/coupons/email outages never block browsing; email failure queues for retry instead of failing checkout.
- All critical transitions append `OrderEvent`s first-class — the timeline *is* the recovery trail.

---

## 14. Payment Architecture

### 14.1 Provider port

```ts
interface PaymentProvider {
  readonly name: string;
  createPayment(input: { amountCents: number; currency: string;
    referenceId: string; idempotencyKey: string; metadata?: Record<string,string> }):
    Promise<{ providerRef: string; clientSecret?: string; status: PaymentStatus }>;
  retrievePayment(providerRef: string): Promise<{ status: PaymentStatus;
    amountReceivedCents?: number }>;
  refund(providerRef: string; amountCents: number; idempotencyKey: string):
    Promise<{ providerRef: string; status: RefundStatus }>;
}
```

OrdersService depends on the port (DI token). StripeAdapter v1. Adding PayPal = new adapter + webhook route; zero changes to order logic.

### 14.2 Flow (Stripe Payment Intent, confirm-on-client)

```
POST /orders {items?, address, couponCode?} + Idempotency-Key
  └─ tx: validate & price cart → reserve inventory → coupon redemption
         → Order(status=pending_payment) + OrderEvents
         → Payment row (status=requires_payment_method)
  └─ createPaymentIntent (server-side amount!) → store providerRef
  └─ respond {orderNumber, clientSecret}

Client: Stripe.js confirmPayment (card elements / redirect methods)
  → return_url = /checkout/return?order=SS-…

Stripe → POST /payments/webhook/stripe   (raw body, signature verified)
  payment_intent.succeeded  → dedupe eventId → tx:
      Payment=succeeded · Order→confirmed (+OrderEvent) · convert reservation→sale
  payment_intent.failed     → Payment=failed (+event) · keep order pending_payment
  charge.refunded           → Payment/Oder→refunded · restock

/checkout/return page: NEVER trusts its own existence as proof.
  Polls GET /orders/:orderNumber/status (auth-scoped) which reflects DB truth.
```

### 14.3 State machines (whitelisted transitions only)

```
Order:  pending_payment → confirmed → processing → shipped → delivered
                     \→ cancelled (pre-payment expiry, admin, or customer)
        confirmed/processing/shipped → refunded (admin, post-refund)
Payment: requires_payment_method → processing? → succeeded | failed | canceled
        succeeded → refunded (partial allowed via refunds rows)
Illegal transition attempts: 409 + audit log entry.
```

### 14.4 Money integrity checklist (enforced by tests)

- Amount always computed server-side from variant prices + coupon + shipping rules.
- Currency never client-chosen v1.
- Refunds ≤ captured amounts; partial refunds tracked per refund row.
- Reconciliation job (§13.2) closes the loop.

---

## 15. Inventory & Concurrency

### 15.1 Model

Per variant: `stockOnHand` (physical), `reserved` (held for pending orders), derived `available = stockOnHand − reserved`. Every movement writes an `InventoryTransaction` row (audit + reconciliation).

### 15.2 The four operations — all single-statement conditional SQL inside the caller's transaction

```sql
-- RESERVE (order placement). Fails explicitly if insufficient:
UPDATE product_variants
   SET reserved = reserved + :qty
 WHERE id = :variantId AND is_active
   AND stock_on_hand - reserved >= :qty;
-- rowCount = 0 ⇒ OUT_OF_STOCK ⇒ rollback entire order tx

-- COMMIT (payment succeeded): reservation becomes a sale
UPDATE product_variants
   SET stock_on_hand = stock_on_hand - :qty,
       reserved      = reserved - :qty
 WHERE id = :variantId AND reserved >= :qty;

-- RELEASE (expiry/cancel): give reserved back
UPDATE product_variants
   SET reserved = reserved - :qty
 WHERE id = :variantId AND reserved >= :qty;

-- RESTOCK (refund) / ADJUST (admin)
UPDATE product_variants SET stock_on_hand = stock_on_hand + GREATEST(:delta, -stock_on_hand) ...
```

Because each statement is atomic and conditional, **overselling is impossible regardless of concurrent checkouts**, without needing higher isolation levels. Two buyers of the last unit: exactly one reserve succeeds; the other gets `OUT_OF_STOCK` with rollback.

### 15.3 Reservation lifecycle

```
checkout start ──► reserved (+tx row 'reserve')
   ├─ payment success ──► commit ('sell')        Order→confirmed
   ├─ TTL 30 min elapsed ──► sweeper releases    Order→cancelled (+events)
   ├─ admin cancel pre-payment ──► release       Order→cancelled
   └─ refund post-delivery ──► restock           Order→refunded
Sweeper: BullMQ repeatable job every 5 min; idempotent (only touches
orders in pending_payment past reservationExpiresAt).
```

### 15.4 Admin adjustments

Adjustment form requires reason; produces `adjust` transaction rows; negative adjustments clamped at zero by SQL; audit-logged.

---

## 16. Redis & Caching

Redis earns its place through exactly three jobs (no "temporary state" dumping ground):

### 16.1 Response/data caching

| Key pattern | Contents | TTL | Invalidation |
|---|---|---|---|
| `content:home:v{n}` | published homepage sections payload | 24 h | version bump on any content mutation (`n` = value of `content:home:ver`) |
| `catalog:featured` | featured products list DTO | 5 min | delete on product write |
| `catalog:product:{slug}` | product detail DTO | 10 min | delete on that product/variant/image write |
| `catalog:facets` | category/anime/character filter trees + counts | 15 min | delete on taxonomy or product status change |

Pattern: read-through cache helpers in a small `CacheService`; only *read* endpoints are cached; admin mutations call targeted invalidation. Cache misses fall through to Prisma. A cache outage must degrade to slower-but-correct (all helpers try/catch → direct DB).

### 16.2 Rate limiting

Sliding-window counters via Lua (`INCR`+`PEXPIRE` semantics atomically), keyed `rl:{bucket}:{ip}` / `rl:{bucket}:{userId}`. Buckets per §12. Throttler returns 429 with `Retry-After`.

### 16.3 Session lookup cache

`sess:{tokenHash}` → session+role snapshot (60 s TTL); revocation deletes key immediately then marks DB row. One DB hit avoided per authenticated request; stale window bounded at 60 s for role demotions (acceptable; ban flows also delete keys).

### 16.4 What Redis does NOT do here

No cart storage, no order state, no primary anything. If Redis dies: site slows (cache misses), rate limits fail-open to conservative defaults, sessions hit Postgres directly, queues pause — nothing is lost.

---

## 17. Background Jobs (BullMQ)

Queues (same NestJS codebase, worker process launched with `WORKER_MODE=workers`):

| Queue | Jobs | Trigger | Retry policy | Idempotency |
|---|---|---|---|---|
| `email` | order confirmation, shipping update, password reset, welcome | order events, auth flows | 5 attempts, exp backoff (30s→…→15m) → DLQ | notification row keyed by `(type, orderId/userId)` unique-ish guard before enqueue |
| `media` | image optimization/metadata fetch after upload | media upload | 3 attempts → DLQ; original remains usable | publicId unique |
| `inventory-sweeper` | release expired reservations | repeatable every 5 min | n/a (idempotent by design) | guarded UPDATEs |
| `payment-recon` | compare pending payments vs provider truth | repeatable every 15 min | n/a | transitions are state-guarded |
| `maintenance` | session cleanup, orphaned cart cleanup | nightly | n/a | idempotent deletes |

Conventions: every job carries `requestId`/correlation ids; handlers structured-log start/end/error; DLQ surfaces in admin dashboard (Phase 9) with requeue button; job payloads contain IDs not blobs (handlers re-fetch fresh state).

---

## 18. Search

**PostgreSQL-native v1** (no Meilisearch/Elasticsearch — catalog scale doesn't justify a second search system):

- Generated `tsvector` column across product name (A) / description (B) / tags+anime+character names (C), GIN-indexed.
- Query: `websearch_to_tsquery('english', :q)` ranked by `ts_rank_cd`, boosted by featured/status filters.
- Typo tolerance: `pg_trgm` similarity as OR-fallback for short queries (`similarity(name, :q) > 0.3`), trigram index on name.
- Facets (category/anime/character counts under current filter set) via grouped count queries on indexed FK columns.
- Pagination: offset/limit with total count (fine ≤ tens of thousands SKUs); sort whitelist: relevance, price±, rating, newest.
- Migration path: `SearchService` interface now; Meilisearch adapter later only if measured latency/relevance demands it.

URL contract (§ shop phase): `/products?search=&anime=&character=&category=&tag=&minPrice=&maxPrice=&minRating=&inStock=&sort=&page=` — server-rendered results from these params (shareable/back-button-safe). Ephemeral UI state (open/closed mobile sheet) stays out of the URL.

---

## 19. Animation Architecture

### 19.1 Ownership tiers (codifies the existing house style)

| Tier | Owner | Examples |
|---|---|---|
| **CSS** | any component | hover/focus states, color transitions, simple transforms, skeleton shimmer, drawer slide-in via class toggles |
| **Component** | component-local `useGSAP` scoped to its ref | button magnetic effect, thumbnail crossfade, quantity stepper feedback |
| **Section** | section-level `useGSAP` + ScrollTrigger (+`matchMedia`) | existing homepage sections, product-info stagger reveal |
| **Page** | page-level coordinator only where genuinely needed | product-detail entrance sequence; order timeline draw |

Rules already honored in this repo and now mandated: every `useGSAP` gets a `scope`; no `document`-wide selectors; context revert handles cleanup; Lenis stays a single global instance (desktop only); `ScrollTrigger.refresh()` on route/image settle (existing `ScrollRefresh` pattern).

### 19.2 Reusable primitives (`components/animations/`, extracted during Phase 2)

- `<Reveal>` — scroll-triggered fade/slide wrapper (replaces repeated boilerplate).
- `splitChars(el)` util — char-splitting used by ChooseShinobi/QuoteSection today.
- `<MagneticButton>`, `useParallax`, `<Marquee>` — as demand appears.
- Product-transition kit: Flip-plugin card→detail handoff when navigating from a grid/card context; graceful staged timeline fallback for direct-load/refresh (Flip requires source element present — deep links can't share elements).

### 19.3 Product detail sequence (Phase 2 target)

```
card click → (Flip where available) image expands toward hero position
→ background tint transition → title chars reveal → info block stagger
→ price/qty/CTA settle in → page fully interactive
Direct load: same sequence minus shared-element step.
```

### 19.4 Reduced motion & accessibility

- Global strategy: `gsap.matchMedia()` includes `(prefers-reduced-motion: reduce)` branches that set final states and skip timelines; LoadingScreen collapses to quick fade; Lenis disabled; marquee/parallax static.
- Motion never gates content: all animated content is visible without JS-complete animation (initial states set via GSAP only after mount, not hidden in CSS by default — the current codebase already follows "set initial state inside useGSAP"; keep it).
- Performance budget per storefront page: transform/opacity-only animations; ≤ ~15 ScrollTriggers/page; no layout-thrashing callbacks; images sized/decoded before hero transitions.

---

## 20. Testing Strategy

### 20.1 Levels & tooling

| Level | Tool | Scope |
|---|---|---|
| Unit | Jest (API), Vitest or Jest (frontend) | pricing/coupon math, order state machine guards, inventory math, RBAC matrix, DTO validation, cart reducer logic |
| Integration | Jest + Supertest + real Postgres/Redis (Docker) | auth flow, catalog endpoints, order creation tx, webhook handling, inventory concurrency |
| E2E | Playwright (chromium+webkit, mobile+desktop viewports) | critical journeys below |
| Contract | OpenAPI typegen drift check in CI | API shape stability |
| A11y/perf spot-checks | axe-core in Playwright; Lighthouse CI budget | key pages |

### 20.2 Critical journeys (E2E)

register → login → browse home → shop → filter/search/sort/paginate → product detail → variant select → add to cart → guest checkout → pay (Stripe test cards incl. decline) → order status timeline → logout. Admin: login → create product w/ variants+images → edit → archive; order status transitions; content section edit reflects on homepage; coupon create + redemption limit; review moderation.

### 20.3 Failure-path suite (mandatory, per global rules)

duplicate order submission (same idempotency key) · unauthorized access to other users' orders (IDOR) · expired reservation cancellation · invalid/expired coupon · insufficient stock race (parallel requests, exactly one wins) · Stripe decline + retry · webhook duplicate/delayed/out-of-order/malformed · provider timeout stubs · DB-failure injection at order creation boundary · role escalation attempts (customer hitting admin routes).

### 20.4 Regression policy

Every bug fix ships with the test that reproduces it first (red) then passes (green). CI runs unit+integration on every PR; full E2E nightly + pre-release.

### 20.5 Coverage expectations

No vanity percentage targets; required coverage concentrated on: OrdersService, PaymentsService/webhooks, InventoryService, CouponService, RBAC guards, session lifecycle.

---

## 21. Observability

Answering the four diagnostic questions first:

- **Failed order?** Trace by `orderNumber`: OrderEvents timeline shows last transition; correlated `requestId` pulls structured logs across request + queue jobs + webhook processing.
- **Payment mismatch?** Payment row ↔ providerRef ↔ WebhookEvent rows ↔ reconciliation job output; mismatch states raise a metric + admin flag.
- **Webhook failure?** Every delivery persisted (receivedAt, processedAt, processingError) even on failure — replayable.
- **Slow endpoint?** LoggingInterceptor durationMs histogram per route (prom-client `/metrics`); slowest-routes alert rule; Prisma query logging in debug env.

Stack: **pino** structured JSON logs with `x-request-id` propagation (frontend sends it; API generates if absent); **Sentry** (free tier) in both apps with release tagging; **prom-client** metrics endpoint (HTTP latency histograms, business counters: orders_created, payment_succeeded/failed, webhook_processed{result}, reservations_released, queue depths via BullMQ); health endpoints §9.1 consumed by deploy platform; audit log doubles as security observability.

Log hygiene: never passwords/tokens/full payment data; PII minimal (emails allowed in operational logs only where necessary, redacted in analytics paths).

---

## 22. CI/CD

GitHub Actions (repo already git-hosted):

```
PR pipeline:
  1 pnpm install --frozen-lockfile
  2 lint (eslint both apps) + typecheck (tsc -p frontend && tsc -p backend)
  3 backend: jest unit
  4 backend: jest integration  (services: postgres:16, redis:7; prisma migrate deploy)
  5 frontend: next build        (type errors fail build)
  6 contracts: openapi typegen drift check
  7 pnpm audit --prod (fail: high) + secret scan (gitleaks)
Nightly / pre-release:
  8 Playwright E2E against compose stack seeded with fixture data
Deploy (main → staging; tag/manual-approval → production):
  9 api image build (multi-stage Docker) → registry → deploy (Railway/Fly/VPS)
 10 prisma migrate deploy (pre-switch gate, rollback = previous image + compatible schema)
 11 frontend → Vercel (preview per PR, prod on main)
 12 post-deploy: hit /health/ready + smoke E2E (login, product page, webhook ping)
Rollback: redeploy previous image/tag; migrations written expand-compatible so N-1 app version still runs.
```

---

## 23. Docker & Deployment

### 23.1 Local development (`docker-compose.dev.yml`)

```yaml
services:
  postgres:   postgres:16-alpine · volume · healthcheck(pg_isready) · port 5432
  redis:      redis:7-alpine · healthcheck(redis-cli ping) · port 6379
  mailpit:    axllent/mailpit (SMTP sink + UI) · optional profile
```

Frontend (`next dev`) and API (`nest start --watch`) and workers (`WORKER_MODE=workers ts watch`) run on host for fast HMR; only infra is containerized during development.

### 23.2 Production topology

- **API + workers:** one multi-stage Dockerfile (pnpm fetch → build → dist + prisma engines; `binaryTargets=["linux-musl-openssl-3.0.x"]`); workers same image different command.
- **Database/Redis:** managed (Railway/Render/Fly add-ons or VPS containers with volumes + backups).
- **Frontend:** Vercel (env: `NEXT_PUBLIC_API_URL`, preview deployments per PR).
- **Domains:** same-site layout — `shinobistore.com` (web) + `api.shinobistore.com` (API) so the session cookie stays same-site; cookie `Domain=.shinobistore.com`.
- Startup order handled by healthcheck-gated depends_on locally; in prod by deploy platform + `/health/ready` gate.
- Backups: managed daily Postgres snapshots + pre-deploy migration dump on staging-like data resets.

---

## 24. Project Structure

```
shinobi-store/
├─ package.json                 # workspace scripts: dev/build/lint/test/e2e
├─ pnpm-workspace.yaml          # frontend, backend, packages/*
├─ docker-compose.dev.yml
├─ .github/workflows/ci.yml
├─ docs/                        # see §28
├─ packages/
│  └─ contracts/                # generated OpenAPI types (openapi-typescript)
├─ frontend/                    # Next.js 16 (existing app evolves)
│  ├─ app/                      # route groups per §8.1
│  ├─ components/               # ui/ product/ shop/ cart/ checkout/ order/
│  │                            # admin/ animations/ sections/ shared/
│  ├─ lib/                      # api clients, store/, animations utils, seo
│  └─ public/                   # existing art assets (seed references these)
└─ backend/                     # NestJS (replaces Express app)
   ├─ src/
   │  ├─ main.ts                # bootstrap, raw-body webhook mount, pipes/filters
   │  ├─ app.module.ts
   │  ├─ common/                # guards, filters, interceptors, rbac/, decorators,
   │  │                          # config validation (fail-fast), cache/, prisma/
   │  ├─ modules/
   │  │  ├─ auth/ users/ catalog/{products,categories,anime,characters,tags,reviews}/
   │  │  ├─ cart/ orders/ payments/ inventory/ coupons/
   │  │  ├─ media/ content/ notifications/ admin/ audit/ health/
   │  └─ scripts/seed.ts        # real seed script (fixes missing one)
   ├─ test/                     # e2e/supertest suites
   └─ Dockerfile
```

Monorepo tradeoff: plain pnpm workspace kept (§6.12). Turborepo deferred until build times or package count demand it.

---

## 25. Implementation Phases

Reordering rationale: original sketch put Product Details first and NestJS/PostgreSQL at phases 6–7. Inspection shows the current backend cannot back any commerce feature safely; building Product Details on throwaway APIs means rebuilding it later. Phases therefore front-load platform foundation while keeping the *user-visible* flagship (Product Details) as the first major feature milestone. Testing/Docker/security are continuous tracks with hardening milestones.

### Phase 0 — Foundation & Platform Reset
- **Objective:** Clean, reproducible engineering base: monorepo hygiene, dev infra, NestJS skeleton, Prisma wiring, CI bootstrap.
- **Dependencies:** none.
- **Affected areas:** repo root, backend replacement, CI.
- **Tasks:** gitignore hygiene (logs, `.agent/`, `.playwright-mcp/`); root scripts (dev/build/test/lint/typecheck); `docker-compose.dev.yml`; NestJS scaffold w/ config-validation (fail-fast env), pino+request-id, exception filter, throttler, session guard skeleton, health endpoints, Prisma client module; OpenAPI setup; contracts codegen wired; Jest+Supertest harness; GitHub Actions PR pipeline (lint/type/unit/build); archive Express backend into `legacy/` until parity (delete at Phase 2 exit).
- **Verification:** compose up → API boots green health; CI pipeline green on sample PR; `pnpm test` runs end-to-end.
- **Risks:** Next 16/Turbopack quirks with workspace imports — verify early.
- **Exit criteria:** fresh clone → `docker compose up -d && pnpm i && pnpm dev` works from README instructions alone.

### Phase 1 — Catalog Domain & Seed Data
- **Objective:** Real product data model + public catalog APIs the storefront can trust.
- **Dependencies:** Phase 0.
- **Affected areas:** Prisma schema (identity/catalog slices), products/taxonomy modules, seed script.
- **Tasks:** migrations for §10.1–10.2 tables incl. indexes/tsvector/trigram; DTOs + validation; public endpoints `GET /products` (pagination/filter groundwork/sort whitelist), `GET /products/:slug` (variants, images, taxonomy, rating), taxonomy list endpoints; RBAC-guarded admin CRUD for products/taxonomies (whitelisted fields); deterministic seed (~24 products, variants, images reusing existing public art, categories/anime/characters); integration tests incl. filter matrix and 404/draft-invisibility paths.
- **Verification:** Supertest suite green; seeded API browsable via Swagger; query plans sanity-checked (indexes used).
- **Risks:** tsvector generation/trigger subtleties — covered by dedicated migration tests.
- **Exit criteria:** all catalog data flows exclusively from Postgres through typed APIs; no mock product data anywhere in frontend yet (frontend still untouched).

### Phase 2 — Product Details Page ⭐ (first user-visible milestone)
- **Objective:** `/products/[slug]` with the cinematic GSAP experience, backed by real APIs.
- **Dependencies:** Phase 1.
- **Affected areas:** frontend routing/data layer, animation primitives, existing character cards become real links.
- **Tasks:** RSC page fetching product via typed client (+generateMetadata SEO, OG tags, JSON-LD Product schema); gallery component (thumbs/main switching, zoom-lite); variant picker + qty stepper + AddToCart wired to refactored zustand store (persisted guest cart, variants-aware); stock badge from availability; related-products rail (same anime/category); entrance sequence per §19.3 (Flip handoff from card contexts, fallback timeline on direct load); extract `<Reveal>`/splitChars/MagneticButton primitives from existing components; reduced-motion branches; loading/error/not-found states; legacy Express backend deleted here (parity reached for what it served: nothing).
- **Verification:** Playwright: card→detail transition, direct-load deep link, refresh mid-animation, mobile/desktop, keyboard-only gallery+CTA, console error-free; Lighthouse pass ≥90 perf on detail page; visual check at 360/768/1280/1920 widths.
- **Risks:** Flip + App Router navigation timing — mitigate with startViewTransition-free manual Flip orchestration inside `useGSAP`; image payload size — next/image sizing discipline.
- **Exit criteria:** every product card/CTA site-wide routes to a real shareable product URL with full UX states.

### Phase 3 — Shop / Products Listing
- **Objective:** Amazon-level IA, Shinobi skin, URL-driven.
- **Dependencies:** Phases 1–2.
- **Affected areas:** `/products` route, shop components, search backend.
- **Tasks:** server-rendered results from URL params (§18 contract); FilterSidebar (desktop) + bottom-sheet (mobile Filters/Sort buttons); active-filter chips; pagination; sort menu; empty/loading(error)/no-results states; FTS+trigram query path; facet counts; E2E for every filter dimension + share/back behavior; skeletons matching final layout (CLS guard).
- **Verification:** Playwright param matrix; URL round-trip tests; mobile viewport interaction pass.
- **Risks:** facet count cost — keep facet queries indexed and bounded; debounce client-driven URL pushes.
- **Exit criteria:** any filtered view is copy-paste shareable and survives back/forward/refresh exactly.

### Phase 4 — Cart
- **Objective:** Trustworthy cart as the bridge to checkout.
- **Dependencies:** Phase 2 (variant model), Phase 1 APIs.
- **Affected areas:** cart store refactor, drawer, header badge.
- **Tasks:** persisted guest cart (zustand persist + hydration-safe pattern); line items carry variantId+snapshot display data; qty clamped to live availability (revalidate on drawer open); merge endpoint called post-login (Phase 5 wires trigger); subtotal/discount-preview display; accessible drawer (focus trap, ESC, aria-live updates).
- **Verification:** unit tests on cart reducer math; E2E add/edit/remove/persist-across-reload; availability edge (item sold out while in cart → flagged line, blocks checkout later).
- **Risks:** hydration mismatch with persisted state — standard skipHydration pattern.
- **Exit criteria:** cart survives reload/browser restart; invalid lines visibly quarantined.

### Phase 5 — Authentication & Account
- **Objective:** Secure sessions, account area, cart merge.
- **Dependencies:** Phases 0–4.
- **Affected areas:** auth module completion, frontend auth pages, navbar account menu.
- **Tasks:** register/login/logout/reset flows (§11.1); rate limits; session cache; account pages (profile, orders placeholder→Phase 6 fills); guest-cart merge on login; protected-route UX (return to intended page); generic-error UX; E2E happy + failure paths (wrong password lockout messaging, enumeration resistance checks).
- **Verification:** integration tests for session lifecycle incl. revocation; security tests (IDOR probes, cookie flags asserted); E2E login/logout persistence.
- **Risks:** cookie behavior across localhost ports — verified same-site; document for contributors.
- **Exit criteria:** sessions revoke instantly; auth pages match design language; no plaintext anything.

### Phase 6 — Checkout, Payments & Orders ⭐ (commerce heart)
- **Objective:** Server-authoritative checkout with Stripe, reservations, order history.
- **Dependencies:** Phases 4–5 (cart/auth), §10.3 schema slice, §14 architecture.
- **Affected areas:** orders/payments/inventory modules, checkout UI, order timeline UI, BullMQ email queue introduction.
- **Tasks:** order-creation mega-transaction (§13.1); Stripe adapter + webhook pipeline w/ dedupe; checkout page (address form, summary, Stripe Elements); return page polling real status; reservation sweeper + recon jobs; confirmation/order-history/timeline pages (animated OrderTimeline); order emails queued; coupons v0 (percentage/fixed, validated server-side); full failure-path test suite (§20.3 payment/inventory subsets).
- **Verification:** Stripe CLI webhook simulation incl. duplicates/replays; parallel-buy race test (last unit, N concurrent); idempotency replay test; E2E purchase journey with test cards success+decline; reconciliation job unit tests.
- **Risks:** webhook local testing friction — Stripe CLI scripted in Makefile/docs; transaction scope bugs — keep tx narrow, services take managers not raw clients ad hoc.
- **Exit criteria:** no sequence of clicks/retries/webhooks produces oversell, double charge acceptance, or stuck-unrecoverable order (proven by automated failure-matrix tests, not belief).

### Phase 7 — Admin CRM ("Shinobi Store Management")
- **Objective:** Operate the store without SQL.
- **Dependencies:** Phases 5–6 (auth/orders exist), §11.2 RBAC.
- **Affected areas:** `(admin)` route group, admin shell, admin modules/APIs.
- **Tasks:** admin layout + role gate (server-side; marketing chrome excluded); dashboard aggregates; Products manager (list/search/filter, create/edit w/ variants matrix + image picker, draft/active/archive); Orders manager (search/filter, detail w/ timeline, whitelisted transitions, refund request flow); Customers list/detail/ban; Inventory adjustments w/ reason+audit; Reviews moderation (approval feeds denormalized rating); Coupons CRUD; Audit-log viewer; DataTable + form primitives; optimistic-free explicit save UX (loading/success/error per mutation).
- **Verification:** RBAC negative tests (every role × every route); E2E product lifecycle + order transition journeys; audit rows asserted for privileged actions.
- **Risks:** admin bundle weight in shared Next app — dynamic imports + separate layout chunks; monitor.
- **Exit criteria:** each role sees/enables exactly its matrix slice; store ops fully possible from UI.

### Phase 8 — Content Management & Media Library
- **Objective:** Homepage becomes CMS-driven.
- **Dependencies:** Phase 7 shell, media/upload infra.
- **Affected areas:** content/media modules, homepage sections refactor, Cloudinary integration.
- **Tasks:** Media Library (upload via signed backend mediation, folders taxonomy, grid w/ metadata, reuse picker, delete guarded by usage check); HomepageSection editor (per-key config forms validated by section schemas, visibility toggle, ordering); hero config fields per prompt §12; refactor homepage sections to render published content (fallback defaults if empty); cache invalidation hooks; audit logging.
- **Verification:** E2E: edit hero title/image → homepage reflects after invalidation; delete-protection test for in-use media; role tests (content_manager can content/media but not orders).
- **Risks:** section config schema drift between editor/API/render — single source of truth zod/class-validator schemas shared via contracts.
- **Exit criteria:** zero hardcoded marketing content in homepage JSX; a non-developer can re-skin the homepage.

### Phase 9 — Redis Caching + Background Jobs Hardening
- **Objective:** Performance + reliability infrastructure matured.
- **Dependencies:** Phases 6–8 surfaces to cache/jobs around.
- **Affected areas:** CacheService rollout, queue DLQ dashboarding, rate-limit expansion.
- **Tasks:** implement §16 caches + invalidations on admin mutations; metrics for hit ratios; BullMQ board-style admin view of queues/DLQ + requeue; job retry/DLQ conventions enforced; load-test hot endpoints (k6 or autocannon) to set budgets; tune connection pooling.
- **Verification:** cache correctness tests (stale-after-write impossible for product/content keys); Redis-down chaos test (site degrades, nothing breaks); queue failure-path tests (poison message lands DLQ, requeue works).
- **Risks:** over-caching personal data — only public read payloads cached (verified list).
- **Exit criteria:** hot reads <50 ms p95 cached; demonstrable resilience to Redis loss.

### Phase 10 — Security & Performance Hardening
- **Objective:** Close every gap before calling it serious.
- **Dependencies:** all prior.
- **Affected areas:** cross-cutting.
- **Tasks:** CSP/HSTS/header audit; dependency audit + upgrade PRs; gitleaks in CI; penetration-style self-review checklist (OWASP ASVS-lite pass): IDOR sweep across every user-scoped endpoint, mass-assignment probes, privilege escalation attempts, webhook forgery attempts, upload abuse cases; performance: image audit (sizes/formats), RSC boundaries review, DB slow-query log triage, N+1 sweep via Prisma logs, frontend bundle analysis; a11y audit (axe sweeps + keyboard passes) and fixes.
- **Verification:** security checklist document filled with evidence links to tests; Lighthouse CI budgets enforced in pipeline; zero critical/high audit findings open.
- **Risks:** finding structural issues late — mitigated because security controls were built-in from Phase 0, this phase verifies rather than retrofits.
- **Exit criteria:** security/perf/a11y evidence documented in `docs/security.md` etc.

### Phase 11 — Testing Completion & E2E Maturation
- **Objective:** Full §20 suite realized (it was built continuously; this closes gaps).
- **Dependencies:** all prior.
- **Affected areas:** test suites, CI nightly.
- **Tasks:** complete Playwright journey matrix (storefront + admin + failure paths) across chromium/webkit desktop+mobile profiles; flake quarantine process; visual-regression screenshots for key pages (optional, budgeted); coverage report concentrated on critical domains meets bar; runbook-tested CI failures.
- **Verification:** nightly pipeline green ×N consecutive; intentional-bug injection exercise (mutation-test style spot checks prove suites catch regressions).
- **Risks:** E2E flakiness eating time — strict selectors, network-idle waits replaced by expectation-based waits.
- **Exit criteria:** confidence statement backed by suite inventory, not vibes.

### Phase 12 — Production Deployment & Observability Finalization
- **Objective:** Deployed, observable, recoverable.
- **Dependencies:** Phase 10 gates.
- **Affected areas:** hosting, domains, secrets, monitoring.
- **Tasks:** prod provisioning per §23; secrets into platform stores; migrate-deploy pipeline w/ backup gate; Sentry releases + alerts (error rate, payment mismatch metric, queue depth); uptime checks; smoke-E2E post-deploy; DNS/cookie domain cutover verification; rollback drill executed once on staging; docs finalized (§28).
- **Verification:** staged promotion rehearsal (staging → prod dry run); forced-failure drills: kill worker mid-job, drop webhook, expire reservation — observe recovery paths live.
- **Risks:** first-real-domain cookie/CORS surprises — rehearsed on staging with identical domain layout.
- **Exit criteria:** production serves seeded catalog; a purchase completes E2E with webhook-confirmed state; dashboards/alerts live; rollback proven.

---

## 26. Verification Strategy

Per-phase gates (all phases): typecheck + lint + relevant tests green in CI; browser verification via Playwright MCP/screenshots for any UI change (rendered output, console clean, responsive widths, reduced-motion); no "compiles = done".

Feature-class specifics:

- **UI features:** interaction tested at 360/768/1280/1920; loading/empty/error states exercised; keyboard pass; console error budget zero.
- **API features:** integration tests against real PG/Redis; negative tests for authz/validation; contract drift check.
- **Money/stock features:** failure-matrix automation (§13/§15) required green before merge; Stripe CLI replay scenarios; concurrency race tests.
- **Infra changes:** compose-from-scratch reproducibility check; migration up/down reviewed; health-gate demonstrated.
- **Docs claims:** any "verified" claim in docs must link to the test/job that proves it.

Self-review ritual before closing any phase (from global rules): double-execution, network failure, provider failure, concurrent execution, malicious input, authz bypass, partial failure, restart recovery, mobile, reduced motion.

---

## 27. Risks & Tradeoffs

| # | Risk / Tradeoff | Mitigation |
|---|---|---|
| 1 | **Scope size vs solo bandwidth** | Phases are independently shippable; storefront works end-to-end before admin polish begins; non-goals list enforced |
| 2 | **Next.js 16 bleeding edge** (caching semantics, Turbopack, proxy/middleware renames) | Phase 0 spike pins exact behaviors used (revalidate tags, cookies, dynamic APIs); framework upgrades isolated from feature work |
| 3 | **Replacing backend discards "working" code** | Accepted deliberately: code was untested, insecure, and unconsumed — documented in §2.3 so the decision is auditable |
| 4 | **Stripe-only v1 looks like lock-in** | Port/adapter boundary + tests written against fake provider prove swapability |
| 5 | **Admin in same Next app couples bundles** | Route groups + dynamic imports now; split into second app later is mechanical if ever needed |
| 6 | **Redis dependency for rate limiting** fails open/closed debate | Fail-open to conservative in-memory limits; nothing critical stores only in Redis |
| 7 | **Offset pagination cost at scale** | Acceptable ≤ ~50k products (documented); cursor migration path noted in search section |
| 8 | **Animation regressions during refactor to CMS content** | Existing components' animation code preserved verbatim where possible; visual snapshots + manual browser verification per phase |
| 9 | **Guest checkout vs account conversion tension** | Guest allowed (friction), account upsell post-purchase; order lookup by number+email for guests |
| 10 | **Test-mode payments never prove real acquiring** | Explicitly out of scope (§4.3); architecture identical, keys swap |

Deliberate simplifications (recorded so future readers know they were choices): role enum+code matrix instead of roles/permissions tables; single `homepage_sections` JSONB table instead of per-section tables; Cloudinary instead of self-managed image pipeline; offset pagination; Postgres FTS instead of dedicated engine.

---

## 28. Documentation Plan

Only documents that will be *used* (each owned by a phase, kept short):

| Document | Owner phase | Purpose |
|---|---|---|
| `docs/architecture.md` | 0 | System diagram, module map, dependency rules, how to add a module |
| `docs/getting-started.md` | 0 | Compose up → seed → run everything (the README contract) |
| `docs/database.md` | 1 | Schema rationale, concurrency model, migration policy |
| `docs/api.md` | 1+ | Conventions, error codes, auth flow; OpenAPI link (generated reference, not hand-maintained) |
| `docs/payments.md` | 6 | State machines, webhook pipeline, failure matrix, reconciliation runbook |
| `docs/security.md` | 10 | Controls checklist with evidence links, RBAC matrix, audit policy |
| `docs/testing.md` | 11 | Suite inventory, how to run, flake policy, failure-path catalog |
| `docs/animation-system.md` | 2 | Ownership tiers, primitives API, reduced-motion rules, performance budget |
| `docs/decisions.md` | continuous | Append-only ADR log (every "deliberate simplification" above starts here) |

Explicitly skipped: design-system storybook site, per-component docs, contribution guides beyond getting-started — no documentation theater.

---

## 29. Portfolio Presentation

Narrative anchors (what this project demonstrates, stated factually):

1. **Architecture judgment:** modular monolith over microservices with explicit reasoning; backend replacement decision justified by inspection evidence, not fashion.
2. **Correct money handling:** server-priced checkout, reservation inventory that provably cannot oversell under concurrency (race-tested), webhook-authoritative payment state with reconciliation.
3. **Security as construction, not sprinkles:** centralized RBAC, revocable sessions, validation everywhere, audit trails, hardened webhooks/uploads — each with negative tests.
4. **Reliability engineering:** failure matrices designed before implementation, then automated as tests (duplicate orders, lost webhooks, provider timeouts, partial failures).
5. **Motion craft with discipline:** GSAP/Lenis system with ownership tiers, shared-element transitions, reduced-motion support, performance budgets — preserving a distinctive visual identity through a full commerce rebuild.
6. **Operational maturity:** structured logs w/ request correlation, metrics, queue visibility, health gates, rollback drills, runbooks answering "how do we diagnose X" concretely.

Presentation guidance: the writeup leads with problems solved and tradeoffs made (this document's §27 is basically the talk track); AI-assisted development is mentioned honestly as tooling within a human-directed engineering process — decisions, review discipline, and verification are the value.

---

## 30. Definition of Done

A phase is done when **all** apply:

- [ ] Objective's exit criteria met (§25) and verified, not assumed
- [ ] Typecheck, lint, unit + integration tests green in CI on the phase PR(s)
- [ ] New business logic covered incl. at least one failure-path test per critical rule
- [ ] UI changes browser-verified across mobile/desktop widths, keyboard, reduced motion, console-clean
- [ ] Security-relevant changes have negative tests (authz, validation, injection-class)
- [ ] Money/inventory-touching changes have their §13/§15 matrix rows automated
- [ ] Docs updated (`decisions.md` entry for any tradeoff made)
- [ ] Self-review ritual (§26) completed with findings fixed or logged

The **project** is done when Phases 0–12 exit criteria hold simultaneously, production serves a seeded catalog with a webhook-confirmed purchase and observable recovery paths, and every claim in the portfolio narrative traces to a test, metric, or drill in the repository.

---

*End of master plan. Implementation should begin at Phase 0 and may not skip phases without an ADR in `docs/decisions.md` justifying the deviation.*

