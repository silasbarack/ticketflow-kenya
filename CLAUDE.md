# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TicketFlow Kenya is a ticket sales / event management platform: organizers create events and ticket types, admins approve them, customers pay via M-Pesa STK Push, tickets are issued as QR codes and scanned at the gate. Two independent apps, no root package.json — run all commands inside `backend/` or `frontend/`:

- `backend/` — NestJS 10 + Prisma + PostgreSQL REST API at `http://localhost:4000/api`
- `frontend/` — Next.js 14 (App Router) + Tailwind at `http://localhost:3000`

## Commands

### Local database (must be running first)

This project uses a **dedicated PostgreSQL instance on port 5433** (not the system service on 5432). It is **not a Windows service** — after a reboot it must be started manually:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\Users\user\pgdata-ticketflow" -l "C:\Users\user\pgdata-ticketflow\server.log" -o "-p 5433" start
```

`backend/.env` already points at it (`ticketflow_user` / `ticketflow_dev_pw` / db `ticketflow_kenya`).

### Backend (`cd backend`)

```powershell
npm run start:dev        # dev server with watch, port 4000
npm run build            # nest build
npm run lint             # eslint --fix
npx prisma generate      # regenerate client after schema changes
npx prisma migrate dev   # create/apply a migration
npm run seed             # ts-node prisma/seed.ts (accounts + 5 events)
npm run prisma:studio    # browse the DB
```

### Frontend (`cd frontend`)

```powershell
npm run dev
npm run build
npm run lint
```

There is **no automated test suite** in either app (no test script exists). Verification is manual — the root README has a step-by-step end-to-end test plan, and seeded logins for each role (admin `admin@ticketflow.co.ke` / `Admin@123`, organizer `organizer@ticketflow.co.ke` / `Organizer@123`, customer `customer1@ticketflow.co.ke` / `Customer@123`).

## Architecture

### Backend

One NestJS module per domain under `backend/src/` (auth, users, organizers, categories, events, ticket-types, orders, payments, mpesa, tickets, checkins, admin, audit-logs, email, health). `prisma/schema.prisma` is the full data model; the lifecycle enums (`EventStatus`, `OrderStatus`, `PaymentStatus`, `TicketStatus`) drive most business logic.

Cross-cutting conventions (in `src/common/`):

- `JwtAuthGuard` is registered **globally** — every route requires a JWT unless decorated `@Public()`. Role restrictions use `RolesGuard` + `@Roles()`.
- Global `ValidationPipe` with `whitelist: true` — DTO fields not declared with class-validator decorators are silently stripped from request bodies.
- Global route prefix is `api` (set in `main.ts`).
- Sensitive actions (approvals, payment transitions, check-ins, admin moderation) are written to `audit_logs` via `audit-logs.service.ts`.

Key invariants that span modules:

- **Payment trust boundary**: only `payments.service.ts` may set a payment to `SUCCESS`, and only in response to the M-Pesa callback (`POST /api/payments/mpesa/callback`) or the dev mock endpoint. Client-reported status is never trusted. Payment success is what triggers commission recording and QR ticket generation.
- **Stock control**: `orders.service.ts` reserves stock by incrementing `TicketType.quantitySold` inside a Prisma transaction at order creation, and releases it if payment fails/cancels. There is no separate reservation table — keep this pattern when touching order/payment flow.
- **Commission**: `PLATFORM_COMMISSION_PERCENT` (default 7%) is applied in `orders.service.ts` at order creation; `platformFee`/`organizerEarning` live on `Order`, and a `PlatformCommission` row is written on payment success.
- **M-Pesa isolation**: all Daraja-specific logic lives in `src/mpesa/mpesa.service.ts`. To add another payment provider, create a sibling module with the same shape (`initiate(...)` + callback handler) and branch on the `PaymentProvider` enum inside `payments.service.ts` — `Payment`/`Order` are provider-agnostic.
- **Mock payments**: with `ENABLE_MOCK_PAYMENTS=true` (local dev only), `POST /api/payments/mock/:paymentId/success` simulates the whole successful callback, so the full purchase → QR ticket flow works without Daraja credentials or a public callback URL.

### Frontend

App Router pages under `app/` map to roles: public browse/checkout, `dashboard/` (customer), `organizer/`, `admin/`. Role-gated pages are wrapped in `components/RequireRole.tsx`.

- Auth: JWT stored in `localStorage` as `tfk_token`, attached by the axios interceptor in `lib/api.ts`; session state comes from `hooks/useAuth.tsx`.
- Checkout polls `GET /payments/order/:orderId` every 3s until the backend webhook flips the payment status; the checkout page also has a dev-only button that calls the mock endpoint.
- `types/` mirrors the backend DTOs/models — keep them in sync when changing backend responses.
- Note: the structure listing in `frontend/README.md` is slightly stale (cart, favorites, settings/appearance, and legal pages have been added since).

### Deployment

Deployed to Render via the `render.yaml` Blueprint (db + both services, free tier — services spin down when idle). The backend start command runs `npx prisma migrate deploy` before boot, so committed migrations are applied automatically on deploy. Env vars marked `sync: false` in `render.yaml` (M-Pesa creds, `FRONTEND_URL`, `MPESA_CALLBACK_URL`, `NEXT_PUBLIC_API_URL`) are set manually in the Render dashboard. Production is never seeded automatically.
