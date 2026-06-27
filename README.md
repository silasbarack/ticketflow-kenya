# TicketFlow Kenya

Full-stack ticket sales and event management platform: organizers create events and ticket
types, customers pay via M-Pesa STK Push, tickets are issued as QR codes, and organizers scan
them at the gate. Admins moderate events, users, and payments.

- **Backend**: NestJS + Prisma + PostgreSQL — [backend/](backend/README.md)
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS — [frontend/](frontend/README.md)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a connection string to a hosted instance)

## Local PostgreSQL (already set up in this workspace)

This machine has a system PostgreSQL 18 service on port 5432, but its superuser password
wasn't available, so a **second, dedicated PostgreSQL instance** was initialized for this
project instead of touching the system service:

- Data directory: `C:\Users\user\pgdata-ticketflow`
- Port: **5433** (not the default 5432, to avoid clashing with the system service)
- Role: `ticketflow_user` / password `ticketflow_dev_pw` (local dev only — change before any
  shared/production use)
- Database: `ticketflow_kenya` (already migrated and seeded)

`backend/.env` is already created and points at it:
```
DATABASE_URL="postgresql://ticketflow_user:ticketflow_dev_pw@localhost:5433/ticketflow_kenya?schema=public"
```

**This Postgres instance is not a Windows service** — it only runs while its process is alive.
If it's not running (e.g. after a reboot), start it with:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\Users\user\pgdata-ticketflow" -l "C:\Users\user\pgdata-ticketflow\server.log" -o "-p 5433" start
```

Stop it with:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\Users\user\pgdata-ticketflow" stop
```

If you'd rather use the existing system PostgreSQL service on port 5432 instead, reset its
`postgres` user password (e.g. via pgAdmin or `ALTER USER postgres WITH PASSWORD '...'` once
logged in), then update `DATABASE_URL` in `backend/.env` accordingly.

## 1. Backend setup

```powershell
cd backend
npm install
```

`.env` already exists with the local database above wired up (skip `Copy-Item .env.example .env`
unless you want to reset it back to the unconfigured template).

Edit `backend/.env` if needed:
- Set a long random `JWT_SECRET` before anything beyond local dev.
- Leave `ENABLE_MOCK_PAYMENTS=true` for local testing (see "Testing the M-Pesa flow" below).
- M-Pesa Daraja sandbox credentials (`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
  `MPESA_SHORTCODE`, `MPESA_PASSKEY`) are only required if you want to trigger a real STK push —
  get them from https://developer.safaricom.co.ke. `MPESA_CALLBACK_URL` must be a public HTTPS
  URL (e.g. via `ngrok http 4000`) for Safaricom to reach your callback endpoint.

```powershell
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

API runs at `http://localhost:4000/api`.

## 2. Frontend setup

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

App runs at `http://localhost:3000`.

## Seeded accounts

| Role      | Email                          | Password       |
|-----------|---------------------------------|----------------|
| Admin     | admin@ticketflow.co.ke          | Admin@123      |
| Organizer | organizer@ticketflow.co.ke      | Organizer@123  |
| Customer  | customer1@ticketflow.co.ke      | Customer@123   |
| Customer  | customer2@ticketflow.co.ke      | Customer@123   |

Seed data also includes 5 event categories and 5 published events (Nairobi Music Festival,
Kenya Tech Summit, Mombasa Beach Sports Gala, Nairobi Theatre Night, Lake Naivasha Cultural
Festival), each with 5 ticket types (Early Bird, Regular, VIP, VVIP, Student).

## End-to-end manual test plan

1. **Register a customer** at `/register` (role: Customer), or log in with a seeded customer.
2. **Register an organizer** at `/register` (role: Organizer) with a company name, or log in
   with the seeded organizer.
3. **Create an event**: as the organizer, go to `/organizer/events/create`, fill in the form,
   submit. The event is created as `DRAFT`. Open it from the dashboard and add at least one
   ticket type.
4. **Submit for approval**: on the event management page, click "Submit for Approval"
   (status becomes `PENDING_APPROVAL`).
5. **Admin approves**: log in as admin, go to `/admin/events`, filter by "PENDING APPROVAL",
   click "Approve" (status becomes `PUBLISHED` and it now appears on `/events`).
6. **Customer buys a ticket**: log in as a customer, open the event on `/events/[id]`, pick a
   ticket quantity, click "Buy Ticket" → redirected to `/checkout/[orderId]`.
7. **Pay via M-Pesa (sandbox) or mock**:
   - Real sandbox: enter a Safaricom test MSISDN and click "Pay with M-Pesa"; approve the STK
     prompt on the test phone. Safaricom calls your `MPESA_CALLBACK_URL`, which marks the
     payment `SUCCESS`.
   - Local/no public URL: click "Dev only: simulate successful callback" after initiating the
     push (or even without a real consumer key/secret, since the mock endpoint bypasses Daraja
     entirely).
8. **Ticket QR is generated**: once the order is `PAID`, go to `/dashboard/tickets` → open a
   ticket → see its QR code at `/tickets/[id]`.
9. **Organizer scans the ticket**: log in as the organizer, go to `/organizer/scan`, pick the
   event, start the camera (or use "Manual Check-in" with the ticket code shown under the QR
   code on the e-ticket page). The ticket flips to `USED`.
10. **Duplicate scan is rejected**: scan/validate the same ticket code again — the API returns
    a 400 error ("Ticket already checked in at ...") and the UI shows it in red.

## Architecture notes

- **Commission**: `PLATFORM_COMMISSION_PERCENT` (default 7%) is applied in
  `backend/src/orders/orders.service.ts` at order creation; `platformFee` and
  `organizerEarning` are stored on the `Order` row and a `PlatformCommission` record is written
  once payment succeeds.
- **Stock control**: ticket quantity is reserved (incremented on `TicketType.quantitySold`) at
  order creation time inside a Prisma transaction, and released if the payment fails/cancels —
  this prevents overselling without requiring a separate "reservation" table.
- **Trust boundary**: the frontend never sets payment status directly. Only
  `payments.service.ts`, reacting to the M-Pesa callback (or the dev-only mock endpoint), can
  mark a payment `SUCCESS` and trigger ticket generation.
- **Adding another payment provider**: see `backend/README.md` → "Adding another payment
  provider".

## Deploying to Render

This repo includes a [`render.yaml`](render.yaml) Blueprint that provisions everything in one
go: a free PostgreSQL database, the NestJS backend, and the Next.js frontend, all as Render
services connected to this GitHub repo.

**Live deployment**:
- Frontend: https://ticketflow-frontend-w47s.onrender.com
- Backend API: https://ticketflow-backend-k1a9.onrender.com/api (health check at `/api/health`)

Both services are on Render's free tier, so they spin down when idle — the first request after
a period of inactivity will be slow while the instance wakes up. The production database is not
seeded by default; see "Seeding the production database" below.

1. Push this repo to GitHub (already done if you're reading this on
   `github.com/silasbarack/ticketflow-kenya`).
2. In the Render dashboard, click **New +** → **Blueprint**, and connect this GitHub repo.
   Render will detect `render.yaml` and show three resources to create: `ticketflow-db`,
   `ticketflow-backend`, `ticketflow-frontend`.
3. Click **Apply**. `DATABASE_URL` and `JWT_SECRET` are wired up automatically (Render
   generates a secure random `JWT_SECRET` for you, and injects the database's internal
   connection string).
4. The backend's first deploy runs `npx prisma migrate deploy` automatically as part of its
   start command, so the schema is applied before the app starts. Seed data is **not** run
   automatically — see "Seeding the production database" below if you want sample data there.
5. Once both services are live, fill in the env vars marked `sync: false` in the Render
   dashboard (these can't be set in the Blueprint itself since they depend on URLs Render
   assigns at creation time):
   - On `ticketflow-frontend`: set `NEXT_PUBLIC_API_URL` to
     `https://<your-backend-service>.onrender.com/api`.
   - On `ticketflow-backend`: set `FRONTEND_URL` to `https://<your-frontend-service>.onrender.com`
     (used for CORS), and `MPESA_CALLBACK_URL` to
     `https://<your-backend-service>.onrender.com/api/payments/mpesa/callback`.
   - If you have real Daraja sandbox/production credentials, also set `MPESA_CONSUMER_KEY`,
     `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY` on the backend.
6. Trigger a manual redeploy of both services after setting those so the new env vars take
   effect.

**Free tier caveats**: Render's free Postgres databases expire after a fixed period and free web
services spin down when idle (so the first request after idling will be slow). Upgrade the plan
in `render.yaml` (or directly in the dashboard) when you're ready for production traffic.

### Seeding the production database

The Blueprint intentionally does **not** run `npm run seed` automatically — seeding should be a
deliberate one-off action, not something that re-runs on every deploy. To seed the deployed
database once: in the Render dashboard, open the `ticketflow-backend` service → **Shell**, and
run `npm run seed`.

## What's complete vs. what to do next

**Complete**: auth (register/login/JWT/forgot-reset password), role-based access control,
event lifecycle (draft → pending → published/rejected → cancelled/completed), ticket types
(Regular/VIP/VVIP/Student/Early Bird), order creation with stock reservation and commission
calculation, M-Pesa STK push + callback + dev mock endpoint, QR ticket generation, gate
scanning (camera + manual) with duplicate-checkin prevention, attendee roster + CSV export,
admin stats/user/event/payment moderation, audit logging, rate limiting, full Next.js UI for
every role.

**Recommended next steps**:
1. Run the commands above and walk through the manual test plan end-to-end on your machine.
2. Plug in real Daraja sandbox credentials and an ngrok tunnel to test a real STK push.
3. Add a transactional email provider (e.g. Resend/SendGrid) and wire it into
   `auth.service.ts#forgotPassword` instead of returning `devToken`.
4. Add automated tests (Jest for backend services/guards, Playwright for the purchase →
   check-in flow) before deploying to production.
5. Swap `posterUrl` free-text input for real image upload (e.g. S3/Cloudinary) if needed.
