# TicketFlow Kenya — Backend API

NestJS + Prisma + PostgreSQL REST API for the TicketFlow Kenya ticket sales and event management platform.

## Stack

- NestJS 10 (TypeScript)
- PostgreSQL + Prisma ORM
- JWT auth (passport-jwt) with role-based guards
- M-Pesa Daraja sandbox integration (`src/mpesa`)
- QR code ticket generation (`qrcode`)

## Setup

```bash
cd backend
npm install
copy .env.example .env   # on Windows (PowerShell: Copy-Item .env.example .env)
```

Edit `.env` and set `DATABASE_URL` to a real PostgreSQL instance, plus a strong `JWT_SECRET`.

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

The API listens on `http://localhost:4000/api` by default.

## Project layout

```
src/
  auth/          register, login, JWT, forgot/reset password
  users/         user profile
  organizers/    organizer profile + dashboard stats
  categories/    event categories (admin-managed)
  events/        event CRUD + lifecycle (draft -> pending -> published/rejected -> cancelled/completed)
  ticket-types/  Regular/VIP/VVIP/Student/Early Bird ticket types per event
  orders/        order creation, reservation, totals + commission calculation
  payments/      payment records, M-Pesa STK push + callback, dev mock endpoint
  mpesa/         isolated Daraja sandbox client (token, password, STK push, callback parsing)
  tickets/       QR ticket generation, lookup by code
  checkins/      gate scanning (QR + manual), duplicate-checkin prevention
  admin/         platform-wide stats, user/event/payment moderation
  audit-logs/    write-only audit trail used by the modules above
  common/        Prisma service, JWT/roles guards, decorators, exception filter
prisma/
  schema.prisma  full data model
  seed.ts        admin + organizer + 2 customers + 5 categories + 5 events with ticket types
```

## Adding another payment provider

All M-Pesa-specific logic lives in `src/mpesa/mpesa.service.ts`. To add Flutterwave, Paystack,
or card payments: create a sibling `src/flutterwave` (etc.) module exposing the same shape
(`initiate(...)`, callback handler), then branch on `PaymentProvider` inside
`payments.service.ts`. The `Payment` and `Order` models are already provider-agnostic.

## Security notes

- Passwords hashed with bcrypt.
- All DTOs validated with `class-validator`.
- `JwtAuthGuard` is registered globally; routes are opted **out** with `@Public()`.
- `RolesGuard` + `@Roles()` restrict organizer/admin-only endpoints.
- Payment status is **only** ever changed by `payments.service.ts` in response to the M-Pesa
  callback (`POST /api/payments/mpesa/callback`) or, in development, the mock endpoint — the
  frontend's reported status is never trusted.
- Sensitive admin actions, event approvals/rejections, payment success/failure, and ticket
  check-ins are written to `audit_logs`.
- Basic rate limiting via `@nestjs/throttler` (100 req/min/IP globally).

## Mock payments (local development only)

Real Daraja sandbox calls require a publicly reachable HTTPS callback URL (e.g. via ngrok).
For local testing without that setup, `ENABLE_MOCK_PAYMENTS=true` in `.env` enables:

```
POST /api/payments/mock/:paymentId/success
```

This simulates a successful M-Pesa callback for the given payment: it marks the order PAID,
records the platform commission, and generates QR tickets — identical to what the real
callback does. Never enable this flag in production.
