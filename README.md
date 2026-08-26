# Shinobi Store

Premium anime-inspired e-commerce platform built around the Naruto universe. Full-stack **storefront + admin CRM** with a demo payment system, email verification, community reviews, and cinematic GSAP-driven UI.

**Live demo:** [shinobi-store.vercel.app](https://shinobi-store.vercel.app)

## Features

### Storefront
- **Character Showcase** — horizontal-scroll gallery with GSAP ScrollTrigger, discount ribbons, and animated product cards
- **Product Catalog** — filterable by anime, character, and category; grid/list views with lazy-loaded images
- **Product Detail** — image gallery, variant selector (color/size), stock badge, size guide, reviews section
- **Cart & Checkout** — persistent guest cart (Zustand + localStorage), merge on login, Stripe/Demo payment flow
- **Community Reviews** — public review wall with star filtering; authenticated users can submit reviews (moderated before publishing)

### Admin CRM
- **Dashboard** — revenue stats, order pipeline, low-stock alerts
- **Product Management** — CRUD with pricing, stock levels, variant management, Cloudinary image upload
- **Order Management** — status tracking, timeline, notes
- **Review Moderation** — approve/reject/delete reviews with aggregate recalculation
- **Content Management** — homepage sections (hero, featured products, character showcase)

### Auth & Security
- Cookie-based session auth (`shinobi_session`) with CSRF protection
- Email verification flow (Mailpit for dev, SMTP for production)
- Password reset via email
- Role-based access control (RBAC): `super_admin`, `admin`, `content_manager`, `order_manager`, `customer`
- Rate limiting (ThrottlerGuard), Helmet security headers, input validation (class-validator)

### Payment System
- **Demo Mode** (`PAYMENT_PROVIDER=demo`) — test cards: `4242...` (success), `4000...0002` (decline), `4000...3155` (3DS)
- **Stripe Mode** — real Stripe integration with webhook signature verification
- Idempotency keys, payment state machine, order reconciliation

### UX Polish
- Smooth scroll (Lenis) with route-aware disabling
- GSAP page transitions and scroll-triggered animations
- Dark theme with orange accent (`#FF6B00`) throughout
- Responsive design (mobile-first, tested across viewports)
- Custom SVG assets (kunai, sharingan, leaf village, scroll seal — all white variants)
- Toast notifications, loading skeletons, error boundaries

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, GSAP 3 + Lenis, Zustand |
| Backend | NestJS 11 (modular monolith), Prisma 6, PostgreSQL 16 |
| Auth | Cookie sessions, SHA-256 token hashing, Redis-cached sessions |
| Email | Nodemailer + SMTP (Mailpit in dev, configurable SMTP in prod) |
| Payments | Stripe / Demo provider with state machine |
| Storage | Cloudinary (product images) |
| Infra | Redis (cache / rate limit / BullMQ), Docker Compose (dev), Vercel (deployment) |
| Testing | Jest (134 unit tests), Supertest (e2e) |

## Repository Layout

```
frontend/           Next.js storefront + admin panel
  app/              App Router pages (shop, product, community, admin, auth)
  components/       UI components (shared, product, sections, auth, checkout)
  lib/              API clients, stores, auth helpers, utilities
  public/           Static assets (SVGs, character renders, sections)

backend/            NestJS API (modular monolith)
  src/modules/      Domain modules: auth, catalog, cart, orders, payments, reviews, ...
  src/common/       Guards, filters, interceptors, RBAC, Redis, config
  prisma/           Schema, migrations, seed data

legacy/             Archived Express+MongoDB skeleton (reference only)
docs/               Engineering documentation
```

## Getting Started

**Prerequisites:** Node >= 20.9, pnpm, Docker (or local PostgreSQL + Redis)

```bash
# 1. Start infrastructure (PostgreSQL :5432, Redis :6379, MailPit :8025)
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
pnpm install

# 3. Set up database
pnpm --filter backend db:deploy
pnpm --filter backend db:seed

# 4. Run everything (frontend :3000 + API :5000)
pnpm dev
```

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://shinobi:shinobi_dev_password@localhost:5432/shinobi_store?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Payment Provider: "demo" | "mock" | "stripe"
PAYMENT_PROVIDER=demo

# Stripe (only if using stripe provider)
# STRIPE_SECRET_KEY=sk_test_...

# SMTP (Mailpit in dev)
SMTP_HOST=localhost
SMTP_PORT=1025
BASE_URL=http://localhost:3000

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
API_URL=http://localhost:5000/api/v1
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Run frontend + backend in parallel (watch mode) |
| `pnpm build` | Build all workspace packages |
| `pnpm lint` / `pnpm typecheck` | Lint / typecheck all packages |
| `pnpm test` | Backend unit tests (134 tests) |
| `pnpm test:e2e` | Backend API tests (full request pipeline) |

### Backend-specific

```bash
pnpm --filter backend db:deploy     # Run Prisma migrations
pnpm --filter backend db:seed       # Seed 24 products + admin user
pnpm --filter backend db:reset      # Reset and reseed database
```

## API

- **Health:** `GET /health` | `GET /health/ready`
- **Swagger:** `/api-docs` (auto-generated OpenAPI docs)
- **Base path:** `/api/v1`

Key endpoints:
- `POST /auth/register` — Create account (sends verification email)
- `POST /auth/login` — Sign in (requires verified email)
- `GET /products` — List products with filters
- `GET /products/:slug` — Product detail
- `GET /products/:slug/reviews` — Product reviews (public)
- `GET /reviews/recent` — Recent reviews across all products (public)
- `POST /products/:slug/reviews` — Submit review (auth required)
- `POST /payments/demo/process` — Process demo payment

## Testing

```bash
pnpm test                # Unit tests (Jest)
pnpm test:e2e            # E2E tests (Supertest + full HTTP pipeline)
```

Demo payment test cards:
| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Payment declined |
| `4000 0000 0000 3155` | Requires 3DS authentication |

## License

Private — not for redistribution.
