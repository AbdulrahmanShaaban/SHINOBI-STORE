# Shinobi Store

**A full-stack, production-shaped e-commerce platform built around the Naruto universe** — storefront, admin back office, payments, reviews, and a CMS, built end-to-end as a portfolio/learning project rather than a real business.

[![Live demo](https://img.shields.io/badge/live%20demo-shinobi--store.vercel.app-FF6B00?style=flat-square)](https://shinobi-store.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)
![License](https://img.shields.io/badge/license-private-lightgrey?style=flat-square)

> Live demo: **[shinobi-store.vercel.app](https://shinobi-store.vercel.app)** — admin panel at `/admin` (credentials on request).

---

## Why this project exists

This isn't a real store — it's a deliberately full-scope build to demonstrate end-to-end product engineering: a real payment integration (with a safe demo mode so no one accidentally charges a card for a fictional hoodie), role-based access control, idempotent webhook handling, a schema-driven CMS, and a monorepo set up the way a small real team would run one — not just a CRUD demo.

A few specific decisions worth a reviewer's attention:
- **The app refuses to boot in production without a real payment provider configured.** `PAYMENT_PROVIDER` has three states — `demo` (simulated gateway with test cards, safe to run publicly), `mock` (instant-succeed, dev/tests only), or a real Stripe key. A boot-time env guard makes it *impossible* to accidentally deploy the instant-succeed mock to production.
- **Stripe webhooks are handled idempotently** — signature-verified against the raw body, deduplicated by `eventId`, and state transitions are no-ops on stale/duplicate events (a webhook retried three times by Stripe can't double-confirm or double-cancel an order).
- **RBAC is a single matrix, not scattered checks** — every role's permissions live in one file (`backend/src/common/rbac/permissions.ts`), so "can this role do this thing" is always answerable by reading one place, not grepping the codebase.

## Features

### Storefront
- Product catalog filterable by anime, character, category, and tags, with faceted counts
- Product detail pages with an image gallery, cursor-tracking zoom, and a mobile zoom control
- Cart (persistent guest cart, merges into the account on login) and checkout
- Product reviews — public to read, submission restricted to signed-in customers, moderated before publishing
- A CMS-driven homepage — hero, banner, featured characters/products, and collections are all editable from the admin panel, not hardcoded

### Admin back office
- Dashboard with order/revenue charts and low-stock alerts
- Product CRUD, including device file uploads for product images (not just pasted URLs)
- Order management with status history
- Review moderation (approve/reject), with rating aggregates recomputed from real approved reviews
- Content editor for every CMS-driven storefront section, with its own device upload + duplicate-file detection

### Auth & security
- Cookie-based session auth with CSRF protection, email verification required before login, password reset via email
- Role-based access control: `super_admin`, `admin`, `content_manager`, `order_manager`, `customer` — one permission matrix, checked via a single guard
- Rate limiting, Helmet security headers, `class-validator` input validation on every DTO

### Payments
- `PAYMENT_PROVIDER=demo` — a simulated gateway with documented test cards (see [Testing](#testing)), safe to run in production for demo purposes
- Real Stripe mode — full webhook signature verification, idempotent event handling, payment state machine
- A boot-time guard makes it impossible to reach production without one of the above explicitly configured

### Engineering details
- Background jobs via BullMQ (Redis-backed) for scheduled/queued work
- Structured logging with request correlation IDs
- OpenAPI schema generated from the NestJS backend, consumed as typed contracts by the frontend (`packages/contracts`) — one source of truth for the API shape, not hand-maintained types on both sides

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React, TypeScript, Tailwind CSS, GSAP + Locomotive Scroll v5 |
| Backend | NestJS 11 (modular monolith), Prisma 6, PostgreSQL |
| Auth | Cookie sessions, hashed tokens, Redis-cached sessions |
| Email | Nodemailer over SMTP (Mailpit in dev) |
| Payments | Stripe adapter / demo provider, shared behind one interface |
| Media | Cloudinary (falls back to a local mock adapter with no external I/O if unset) |
| Jobs | BullMQ over Redis |
| Infra | Docker Compose (local Postgres/Redis), Vercel (frontend + backend, deployed as separate projects) |
| Testing | Jest (unit), Supertest (API/e2e) |

## Repository layout

```
frontend/            Next.js storefront + admin panel
  app/                App Router pages — shop, product, checkout, account, admin
  components/         UI components (shared, product, sections, admin, auth)
  lib/                API clients, stores, utilities
  public/             Static assets

backend/             NestJS API (modular monolith)
  src/modules/        Domain modules — auth, catalog, cart, orders, payments,
                      reviews, content, media, queue, notifications, admin
  src/common/         Guards, filters, interceptors, RBAC, Redis, config, logging
  prisma/             Schema, migrations, seed data

packages/contracts/  OpenAPI-generated TypeScript types, shared by both apps
```

## Getting started

**Prerequisites:** Node ≥ 20.9, pnpm, Docker (or a local PostgreSQL + Redis)

```bash
# 1. Start infrastructure — Postgres :5432, Redis :6379, Mailpit :8025
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
pnpm install

# 3. Set up the database
pnpm --filter backend db:deploy
pnpm --filter backend db:seed

# 4. Run everything — frontend :3000, API :5000
pnpm dev
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full, commented list — the short version:

**Backend** — `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`, one of `PAYMENT_PROVIDER=demo` / `PAYMENT_PROVIDER=mock` / a real `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, Cloudinary credentials (optional — falls back to a local mock adapter), SMTP credentials.

**Frontend** — `API_URL` and `NEXT_PUBLIC_API_URL` are the **bare backend origin** (e.g. `http://localhost:5000`, no `/api/v1` suffix — the client code appends that itself), plus `NEXT_PUBLIC_SITE_URL` for metadata/JSON-LD.

> Production note: the backend refuses to boot without `DATABASE_URL`, `REDIS_URL`, and one of the payment-provider options above set explicitly — this is intentional, not a bug, see [Why this project exists](#why-this-project-exists).

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Run frontend + backend together (watch mode) |
| `pnpm build` | Build all workspace packages |
| `pnpm lint` / `pnpm typecheck` | Lint / typecheck every package |
| `pnpm test` | Backend unit tests |
| `pnpm test:e2e` | Backend API tests (full request pipeline) |

```bash
pnpm --filter backend db:deploy     # Run Prisma migrations
pnpm --filter backend db:seed       # Seed demo products + admin user
pnpm --filter backend db:reset      # Reset and reseed
```

## API

- **Health:** `GET /health` · `GET /health/ready` (unversioned, for platform health checks)
- **Docs:** `GET /api-docs` (Swagger/OpenAPI, auto-generated from the NestJS decorators)
- **Base path:** everything else lives under `/api/v1`

A few representative endpoints:
- `POST /auth/register` / `POST /auth/login` — account creation and sign-in (email verification required)
- `GET /products` · `GET /products/:slug` — catalog and product detail
- `GET /products/:slug/reviews` (public) / `POST /products/:slug/reviews` (auth required, moderated)
- `POST /payments/demo/process` — demo-mode payment processing
- `POST /orders/webhooks/stripe` — Stripe webhook receiver (signature-verified, idempotent)

## Testing

```bash
pnpm test        # Jest unit tests
pnpm test:e2e    # Supertest end-to-end tests, full HTTP pipeline
```

Demo-mode test cards (only relevant when `PAYMENT_PROVIDER=demo`):

| Card number | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 3155` | Requires 3-D Secure |

## License

Private — a personal/portfolio project, not for redistribution.
