# Architecture

> Source of truth: `SHINOBI-STORE-IMPLEMENTATION-PLAN.md` §5–§10. This page is the working summary.

## System shape

```
Browser ──► Next.js 16 (storefront + /admin) ──► NestJS API (modular monolith)
                                                      │
                              ┌───────────────────────┼──────────────────┐
                              ▼                       ▼                  ▼
                        PostgreSQL                Redis            Stripe/Cloudinary/SMTP
                        (Prisma)          cache · rate-limit ·      (external, timeout+retry
                                           BullMQ backing           policies per plan §13)
```

- One deployable API. Modules communicate through exported services only.
- The backend is authoritative for prices, stock, roles, order/payment state.
- Future clients (mobile) consume the same REST surface (`/api/v1`).

## Request pipeline (order matters)

```
helmet → CORS(credentialed allowlist) → json body (1 MB)
→ RequestContextMiddleware (x-request-id in/out + req.log child)
→ ValidationPipe (whitelist + forbidNonWhitelisted + transform)
→ ThrottlerGuard (Redis-ready baseline; health endpoints skipped)
→ Controller → Service → Prisma/Redis/adapters
→ AllExceptionsFilter (stable error contract {statusCode,error,message,code,requestId})
→ LoggingInterceptor (one structured access-log line)
```

## Error contract

```jsonc
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "...",
  "code": "NOT_FOUND_ERROR",   // stable machine code — frontend keys UX on this
  "requestId": "uuid"
}
```

## Conventions

- Health probes unversioned (`/health`, `/health/ready`); all other routes under `/api/v1`.
- Money = integer cents. No floats.
- Every module owns its tables; cross-module writes go through the owning service.
- Adding a module: `src/modules/<name>/` with `*.module.ts`, controllers, services, DTOs; register in `AppModule`; document public APIs via OpenAPI decorators; contract types regenerate via `pnpm contracts:generate`.

## Current modules

| Module | Status |
|---|---|
| Health | ✅ Phase 0 |
| Prisma/Redis infrastructure | ✅ Phase 0 |
| Session guard skeleton | ✅ Phase 0 (rejections until Phase 5) |
| Catalog (products/taxonomies) | Phase 1 |
| Cart / Orders / Payments / Inventory | Phases 4–6 |
| Content / Media / Admin | Phases 7–8 |
