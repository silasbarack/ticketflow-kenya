# TicketFlow Kenya — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend for TicketFlow Kenya.

## Setup

```bash
cd frontend
npm install
copy .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

The app runs on `http://localhost:3000`. It expects the backend API at the URL in
`NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api`).

## Structure

```
app/
  page.tsx                          landing page
  events/page.tsx                   browse + filter published events
  events/[id]/page.tsx              event details + ticket selection
  checkout/[orderId]/page.tsx       M-Pesa STK push + payment status polling
  login/ register/                  auth pages
  forgot-password/ reset-password/  password recovery
  dashboard/page.tsx                customer dashboard
  dashboard/tickets/page.tsx        my tickets
  tickets/[id]/page.tsx             e-ticket with QR code
  organizer/dashboard/page.tsx      organizer stats + events list
  organizer/events/create/page.tsx  create event
  organizer/events/[id]/page.tsx    manage event + ticket types + lifecycle actions
  organizer/events/[id]/attendees/  attendee roster + CSV export
  organizer/scan/page.tsx           QR camera scanner + manual check-in
  admin/dashboard/page.tsx          platform stats
  admin/events/page.tsx             approve/reject/suspend events
  admin/users/page.tsx              suspend/activate users
  admin/payments/page.tsx           payment ledger
components/   Navbar, Footer, DashboardLayout (sidebar), EventCard, StatusBadge, RequireRole, QrScanner
hooks/        useAuth (JWT session context)
lib/          api.ts (axios instance + interceptors), format.ts
types/        shared TypeScript types mirroring the backend DTOs/models
```

## Auth flow

JWT is stored in `localStorage` (`tfk_token`) and attached to every request via an axios
request interceptor (`lib/api.ts`). `hooks/useAuth.tsx` exposes `login`, `register`, `logout`,
and the current `user`. `components/RequireRole.tsx` wraps role-gated pages and redirects
unauthenticated/unauthorized users.

## Payment flow

1. Customer selects tickets on the event page → `POST /orders` reserves stock and creates a
   `PENDING` order.
2. Checkout page collects an M-Pesa phone number → `POST /payments/mpesa/stk-push`.
3. The page polls `GET /payments/order/:orderId` every 3s until the backend's webhook
   (`POST /payments/mpesa/callback`) flips the payment to `SUCCESS` or `FAILED`.
4. For local development without a public callback URL, a clearly-labeled "Dev only: simulate
   successful callback" button calls the mock endpoint instead.
