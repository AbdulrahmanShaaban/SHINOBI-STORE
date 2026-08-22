# Shinobi Store

Premium anime-inspired e-commerce platform: **storefront + headless CMS + admin CRM** over one authoritative API.

> **Implementation blueprint:** [`SHINOBI-STORE-IMPLEMENTATION-PLAN.md`](./SHINOBI-STORE-IMPLEMENTATION-PLAN.md) · Decision log: [`docs/decisions.md`](./docs/decisions.md)

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, GSAP 3 + Lenis, Zustand |
| Backend | NestJS (modular monolith), Prisma, PostgreSQL |
| Infra | Redis (cache / rate limit / BullMQ), Docker Compose (dev), GitHub Actions (CI) |

## Repository layout

```
frontend/          Next.js storefront + admin (pnpm workspace package)
backend/           NestJS API (pnpm workspace package)
packages/contracts Generated OpenAPI spec + TS types
legacy/            Archived Express+MongoDB skeleton (reference only, do not run)
docs/              Engineering documentation
```

## Getting started (development)

Prerequisites: **Node ≥ 20.9**, **pnpm**, and either **Docker** or locally installed PostgreSQL 16 + Redis 7.

```bash
# 1. Start infrastructure (PostgreSQL :5432, Redis :6379, MailPit UI :8025)
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
pnpm install

# 3. Create the schema and seed the catalog (24 products)
pnpm --filter backend db:deploy
pnpm --filter backend db:seed

# 4. Run everything (frontend :3000 + API :5000)
pnpm dev
```

Without Docker? Install PostgreSQL and Redis natively with the credentials from `backend/.env.example`, or override `DATABASE_URL` / `REDIS_URL` in `backend/.env`.

The API boots even when infrastructure is down; check `/health` (liveness) and `/health/ready` (dependency report):

```bash
curl http://localhost:5000/health        # → {"status":"ok"}
curl http://localhost:5000/health/ready  # → per-dependency status report
```

API docs (OpenAPI/Swagger): <http://localhost:5000/api-docs>

## Scripts (root)

| Command | Purpose |
|---|---|
| `pnpm dev` | Run frontend + backend in parallel (watch mode) |
| `pnpm build` | Build all workspace packages |
| `pnpm lint` / `pnpm typecheck` | Lint / typecheck all packages |
| `pnpm test` | Backend unit tests |
| `pnpm test:e2e` | Backend API tests (full request pipeline) |
| `pnpm contracts:generate` | Regenerate typed API contracts from the NestJS OpenAPI spec |

## Current status

Phase 0 — Foundation & Platform Reset: **complete**.
Next up: Phase 1 — Catalog Domain & Seed Data (see the implementation plan).
