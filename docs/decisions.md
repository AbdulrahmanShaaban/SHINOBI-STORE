# Decision Log (ADRs)

Append-only. One entry per architectural decision that a future engineer would otherwise have to reverse-engineer.

---

## ADR-001 — Replace the Express + MongoDB backend with NestJS + PostgreSQL + Prisma

- **Date:** 2026-08-22 · **Status:** Accepted
- **Context:** The original `backend/` was an unconsumed Express/Mongoose skeleton with structural defects: client-supplied payment amounts, client-computed order totals persisted as-is, mass assignment on admin CRUD, webhook events only logged, non-revocable JWT with hardcoded secret fallback, no transactions, no tests.
- **Decision:** Rebuild as a NestJS 11 modular monolith on PostgreSQL via Prisma.
- **Consequences:** Real constraints/transactions for money and stock; enforced module boundaries; DI-based guards/filters/pipes. The Express app is archived under `legacy/` and never executed.

## ADR-002 — Delete-on-migrate instead of long-lived archive

- **Date:** 2026-08-22 · **Status:** Amended (deviation from plan wording)
- **Context:** The plan said to archive the Express backend "until parity". Inspection showed it has **zero consumers** (the frontend never called it) and git history preserves every file.
- **Decision:** Keep the archive in `legacy/` only as inert reference; it is excluded from workspaces, lint, typecheck, CI, and will be deleted at Phase 2 exit rather than maintained.

## ADR-003 — Opaque revocable sessions over stateless JWT

- **Date:** 2026-08-22 · **Status:** Accepted (implementation lands in Phase 5)
- **Decision:** Authentication uses random opaque tokens; SHA-256 hashes stored in the `sessions` table; delivered as `httpOnly` cookie (web) or Bearer header (future clients); Redis caches lookups.
- **Why:** Admin CRM requires instant revocation (ban, compromise). Stateless JWT makes that a denylist — i.e., sessions with extra steps.

## ADR-004 — Plain pnpm workspace (no Turborepo/Nx)

- **Date:** 2026-08-22 · **Status:** Accepted
- **Why:** Two apps + one generated-types package is exactly what pnpm workspaces handles natively. Orchestration tooling adds cost without a current problem. Re-evaluate if package count or build times demand it.

## ADR-005 — Health probes degrade instead of crash-looping

- **Date:** 2026-08-22 · **Status:** Accepted
- **Decision:** `/health` (liveness) never checks dependencies. `/health/ready` reports per-dependency status and returns 503 when something is down. Prisma/Redis connections are lazy with bounded retries so an outage degrades readiness rather than killing the API process. Config errors still fail fast at boot (`validateEnv`).
- **Verified by:** `backend/test/app.e2e-spec.ts` asserts contract consistency with infrastructure both present and absent.

## ADR-006 — Dependency audit starts non-blocking

- **Date:** 2026-08-22 · **Status:** Provisional
- **Decision:** `pnpm audit --prod` runs in CI with `continue-on-error` until existing advisories are triaged on this dependency set; then it flips to blocking. Tracked as a hardening task (plan Phase 10).

## ADR-007 — CSP not set at the API layer

- **Date:** 2026-08-22 · **Status:** Accepted
- **Decision:** helmet runs with default headers but no Content-Security-Policy: the API serves JSON (plus Swagger docs in dev), and browser-facing CSP belongs to the frontend/edge layer (Next.js config, Phase 10).
