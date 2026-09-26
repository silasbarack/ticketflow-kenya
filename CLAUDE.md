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

- **Payment trust boundary**: only `payments.service.ts` may set a payment to `SUCCESS`, and only on Safaricom's own word — the M-Pesa callback (`POST /api/payments/mpesa/callback`), the `stkpushquery` status query, or the dev mock endpoint. Client-reported status is never trusted, and an accepted STK push is not a successful payment. Payment success is what triggers commission recording and QR ticket generation.
- **STK settlement is callback-independent**: the callback is the fast path, not the only one. `payments.service.ts#reconcile` asks Daraja what happened whenever the buyer's screen polls `GET /api/payments/:id/status`, and `payment-reconciliation.service.ts` sweeps stale pending payments every 30s for buyers who closed the tab. Keep both paths working when touching payments — a lost callback (sleeping instance, rotated tunnel URL, wrong `MPESA_CALLBACK_URL`) otherwise leaves an order `PENDING` forever holding its stock. Payments are only written off on Safaricom's verdict or at `MPESA_STK_HARD_EXPIRY_SECONDS`; a success arriving after that is still honoured and re-reserves stock.
- **`PaymentStatus` has five states**: `PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`, `EXPIRED`. `EXPIRED` (unanswered prompt) is deliberately distinct from `FAILED` (wrong PIN, no balance) because the buyer is told to request a fresh prompt rather than that their payment failed. Daraja result codes are mapped in `mpesa.service.ts#classifyResultCode`.
- **One live prompt per order**: `initiateStkPush` is serialised per order and returns any live prompt rather than pushing a second one, so double-clicks, refreshes and retries cannot charge a buyer twice. A retry after a failure calls `ordersService.reopenForRetry`, which re-takes the reservation and fails loudly if the tier sold out meanwhile.
- **Password reset is code-based**: `auth/password-reset.service.ts` emails a 6-digit code (`crypto.randomInt`), verifies it, then allows one password change through a short-lived reset token. Both secrets are stored only as hashes — codes as HMAC-SHA256 keyed with `PASSWORD_RESET_SECRET` (a bare hash of a 6-digit code is reversible), tokens as SHA-256. Every transition is a conditional `updateMany` against the expected prior state, so parallel requests cannot exceed the 5-attempt cap, double-verify a code or replay a token; an attempt is claimed *before* the comparison. `POST /auth/password-reset/request` returns an identical body and is held to a response-time floor for every email, registered or not — keep it that way, it is the anti-enumeration guarantee. Per-account limits (60s cooldown, 5 codes/hour) live in the service; the per-IP `@Throttle` limits are only an outer layer and depend on `TRUST_PROXY` behind Render.
- **JWTs are revocable by password change**: `JwtStrategy.validate` looks the user up on every authenticated request and rejects tokens from inactive accounts or issued before `User.passwordChangedAt`. That lookup is what makes a password reset sign the account out everywhere.
- **Stock control**: `orders.service.ts` reserves stock by incrementing `TicketType.quantitySold` inside a Prisma transaction at order creation, and releases it if payment fails/cancels. There is no separate reservation table — keep this pattern when touching order/payment flow.
- **Commission**: `PLATFORM_COMMISSION_PERCENT` (default 9%) is applied in `orders.service.ts` at order creation as a buyer-paid service fee: `totalAmount` = ticket subtotal + fee, `organizerEarning` = full subtotal, `platformFee` = the fee. A `PlatformCommission` row is written on payment success. The frontend mirrors the percentage via `NEXT_PUBLIC_SERVICE_FEE_PERCENT` (`lib/fees.ts`) for pre-order display — keep the two env vars in sync.
- **M-Pesa isolation**: all Daraja-specific logic lives in `src/mpesa/mpesa.service.ts`. To add another payment provider, create a sibling module with the same shape (`initiate(...)` + callback handler) and branch on the `PaymentProvider` enum inside `payments.service.ts` — `Payment`/`Order` are provider-agnostic.
- **Mock payments**: with `ENABLE_MOCK_PAYMENTS=true` (local dev only), `POST /api/payments/mock/:paymentId/success` simulates the whole successful callback, so the full purchase → QR ticket flow works without Daraja credentials or a public callback URL.

### Frontend

App Router pages under `app/` map to roles: public browse/checkout, `dashboard/` (customer), `organizer/`, `admin/`. Role-gated pages are wrapped in `components/RequireRole.tsx`.

- Auth: JWT stored in `localStorage` as `tfk_token`, attached by the axios interceptor in `lib/api.ts`; session state comes from `hooks/useAuth.tsx`.
- Password reset: `/forgot-password` → `/verify-reset-code` → `/reset-password`. Progress between steps (email, then the reset token) lives in **sessionStorage** via `lib/password-reset.ts`, never localStorage, and each page redirects to `/forgot-password` when its prerequisite is missing or expired. The password rules in `lib/password.ts` mirror `backend/src/common/validators/password.validator.ts`.
- Checkout (`app/checkout/[orderId]`) collects and confirms the M-Pesa number; pressing Pay stashes it in `sessionStorage` and routes to the dedicated payment-processing screen at `app/checkout/[orderId]/payment`, which is what actually fires the STK push. That screen polls `GET /payments/:id/status` every 3s and stops on any final state. Its states live in `lib/payment-flow.ts` (`INITIALIZING` → `STK_SENT` → `WAITING_FOR_CONFIRMATION` → `VERIFYING` → `SUCCESS`/`CANCELLED`/`FAILED`/`TIMEOUT`) — render from that state, never from a bare loading boolean. On success it hands back to the checkout route, which owns the existing ticket-confirmation screen.
- `types/` mirrors the backend DTOs/models — keep them in sync when changing backend responses.
- Branding: logo artwork lives in `frontend/public/brand/` (horizontal, stacked, mark, plus `-light` variants for dark backgrounds) and is rendered through `components/Logo.tsx`. `backend/assets/logo.png` is the same lockup on white, embedded in SMTP emails (CID attachment) and PDF tickets. The design system is `app/globals.css` (`tf-*` classes); Poppins is the heading face and Caveat the handwritten accent.
- Note: the structure listing in `frontend/README.md` is slightly stale (cart, favorites, settings/appearance, and legal pages have been added since).

### Deployment

Deployed to Render via the `render.yaml` Blueprint (db + both services, free tier — services spin down when idle). The backend start command runs `npx prisma migrate deploy` before boot, so committed migrations are applied automatically on deploy. Env vars marked `sync: false` in `render.yaml` (M-Pesa creds, `FRONTEND_URL`, `MPESA_CALLBACK_URL`, `NEXT_PUBLIC_API_URL`) are set manually in the Render dashboard. Production is never seeded automatically.
