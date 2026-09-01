# TicketFlow Kenya — Mobile App

Customer-facing mobile app for TicketFlow Kenya, an event ticketing platform for the Kenyan market: browse events, buy tickets, pay via M-Pesa, and hold QR tickets on your phone. A staff-only screen also lets organizers/admins scan tickets at the gate.

This app is the mobile counterpart to `../backend` (NestJS + Prisma + PostgreSQL) and `../frontend` (Next.js web app) in this repo. It talks to the same backend API, but ships today with a full **mock data mode** so the entire customer journey works with no backend running at all.

## Stack

- [Expo](https://expo.dev) SDK 54 + [Expo Router](https://docs.expo.dev/router/introduction/) v6 (file-based routing, typed screens are disabled — see Limitations)
- React Native 0.81.5 on React 19.1, TypeScript 5.9 (strict)
- [Zustand](https://github.com/pmndrs/zustand) for client state (auth session, checkout draft)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) for forms and runtime validation of API responses
- [Axios](https://axios-http.com/) for networking, with a JWT-attaching/refreshing interceptor
- `expo-secure-store` for tokens, `expo-camera` for the QR scanner, `expo-image`, `expo-file-system` + `expo-sharing` for ticket PDFs, `react-native-qrcode-svg` for QR rendering
- No custom native modules — the whole app runs in **Expo Go**, no dev build required (yet)

> ### ⚠️ The SDK is pinned to 54 on purpose — do not upgrade
>
> Expo Go supports exactly **one** SDK version per app build. The target Android phone can only install **Expo Go 54.0.8** from the Play Store, because Expo Go for SDK 55+ is built on React Native 0.83+ and requires a newer Android API level than that device has.
>
> Raising the SDK (or running a tool that does) makes the app refuse to open on that phone with *"Project is incompatible with this version of Expo Go."* Upgrading only becomes safe after migrating to a development build (see [Migrating from Expo Go](#migrating-from-expo-go-to-a-production-build)), where Expo Go is no longer used.

## Getting started

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or press `a` to launch an Android emulator. The app boots straight into mock mode — no backend, no `.env`, no login credentials needed. Use the "Create account" screen with any email/password to get a session, or check `src/data/mock-events.ts` for the seeded catalog.

## Mock mode vs. the real API

`src/constants/config.ts` has one switch:

```ts
export const USE_MOCK_DATA = true;
```

> **Currently set to `false`** — the app talks to the real backend and performs real M-Pesa STK pushes. Flip it back to `true` for offline demos.

- **`true`** — every `src/services/*.service.ts` call is served by an in-memory mock layer (`src/services/mock-state.ts` + six seeded Kenyan events in `src/data/mock-events.ts`). Auth, orders, M-Pesa STK push (auto-confirms after ~6s), and ticket issuance all work end-to-end with no network calls. Nothing here is real payment or real data — treat it as a demo/dev fixture only.
- **`false`** — every service switches to its `real*Service` implementation, which calls the NestJS backend at `EXPO_PUBLIC_API_URL` via the shared `api.ts` Axios instance (JWT attached from SecureStore; a 401 ends the session, since the API issues no refresh token). This path triggers **real Safaricom Daraja STK pushes**.

Screens never know which mode is active — they only import from `src/services/*`, and each service file exports `USE_MOCK_DATA ? mockXService : realXService`. Flip the flag, restart Metro, done.

The API predates this app and uses different field names and enums (`firstName`/`lastName`, `startDateTime`, `quantity`/`quantitySold`, `SUCCESS` vs `PAID`, `ACTIVE` vs `VALID`). Everything is translated in one place — `src/services/backend-mappers.ts` — so screens only ever see this app's own domain types.

### Setting up the real API

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_URL` to your backend's **LAN IP**, not `localhost` (see below).
3. Set `USE_MOCK_DATA = false` in `src/constants/config.ts`.
4. Restart `npx expo start -c` (env vars are read at bundle time).

**Why `localhost` doesn't work from your phone:** `http://localhost:4000` on your phone means "port 4000 on the phone itself." Your backend is running on your development machine, not the phone, so the request never reaches it — you'll see a network-error state everywhere. This only bites physical devices and some emulator configurations; it doesn't affect mock mode at all.

**Finding your LAN IP (Windows):**

```powershell
ipconfig
```

Look for the `IPv4 Address` under your active Wi-Fi adapter (typically `192.168.x.x`). Your phone and dev machine must be on the **same Wi-Fi network**. Then set:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api
```

If `EXPO_PUBLIC_API_URL` is missing while `USE_MOCK_DATA` is `false`, the app logs a loud `console.error` on startup so the failure is obvious instead of silently sending requests to `undefined`.

**Your LAN IP going stale is handled automatically.** In development builds only, if `EXPO_PUBLIC_API_URL` points at a LAN IP or `localhost` that isn't the machine serving Metro, `src/constants/config.ts` swaps in Metro's host (keeping the port and path) and logs which URL it used. Since Metro is running on the same machine as your backend, the app keeps working after DHCP hands you a new address — you don't have to re-run `ipconfig` and edit `.env` every time you change networks.

This never applies to release builds, to `https://` URLs, or when Metro is reached over `--tunnel`; in those cases `.env` is used exactly as written.

## M-Pesa STK push

With `USE_MOCK_DATA = false`, tapping **Send M-Pesa Prompt** performs a genuine
Lipa na M-Pesa Online request:

```
app  ──POST /orders──────────────────▶  backend   (reserves stock, computes authoritative total)
app  ──POST /payments/mpesa/stk-push─▶  backend ──▶ Safaricom Daraja
                                                        │
                                              STK prompt on the phone
                                                        │
Safaricom ──POST /payments/mpesa/callback──▶ backend  (only place a payment may become SUCCESS)
app  ──GET /payments/:id (every 3s)──▶  backend   (stops on any terminal status)
```

The app **never** issues a ticket itself. It polls until the backend reports
the payment as settled, and only then loads the ticket the backend generated.

### How a payment settles without a public callback

> ### ⚠️ The Daraja sandbox spends real money
>
> A sandbox STK push sent to a real Safaricom line **debits that line's actual
> M-Pesa balance**. The prompt is indistinguishable from a production one, the
> PIN is real, and the funds are paid to Safaricom's shared test shortcode
> `174379` ("Daraja-Sandbox") — which nobody here controls and cannot refund
> from. Only Safaricom can reverse such a payment.
>
> `MpesaService#assertPhoneAllowedForSandbox` therefore refuses any non-production
> push to a number that is not Safaricom's test MSISDN (`254708374149`) or listed
> in `MPESA_TEST_PHONES` in `backend/.env`. Add your own number there only if you
> accept that it will genuinely be charged.

`backend/.env` is configured for the Daraja **sandbox** (`MPESA_ENV=sandbox`,
shortcode `174379`). The prompt reaches a real phone, but Safaricom cannot POST
the result back to a laptop on your LAN — so the callback never arrives in
local development.

The backend closes the loop from its own side instead. Whenever the app polls a
`PENDING` M-Pesa payment, `payments.service.ts#reconcilePending` asks Daraja for
that transaction's outcome (`mpesa.service.ts#queryStkStatus`, the STK Push
Query API) and settles the payment on the answer. **No tunnel and no public URL
are needed** — a real STK push now completes end-to-end on a dev machine.

This does not loosen the payment trust boundary: the verdict still comes from
Safaricom over an authenticated call, and the client only triggers the lookup by
polling. Two consequences worth knowing:

- Payments settled this way have **no `mpesaReceiptNumber`** — only the callback
  carries the receipt. The status, tickets, and commission are all correct.
- Queries are throttled to one per payment per 8s, because Daraja spike-arrests
  at roughly 30 queries/minute per app.

The callback remains the fast path and is still the only thing that records a
receipt, so production (where `MPESA_CALLBACK_URL` is publicly reachable) is
unchanged — it just gains recovery for callbacks that get lost.

Two alternatives are still available:

| Option | Setup | Trade-off |
|---|---|---|
| **Dev simulate button** | Keep `ENABLE_MOCK_PAYMENTS=true` in `backend/.env`. While a payment is pending, a dev-only **"Simulate M-Pesa confirmation"** button appears on the payment screen. | Skips Safaricom entirely — instant, but proves nothing about the real integration. |
| **Point at the deployed backend** | Set `EXPO_PUBLIC_API_URL` to the Render backend, whose callback URL is already public. | Real callback, including the receipt number; Render's free tier cold-starts (~50s first request). |

### Attendee details on multi-ticket orders

Matching the web checkout, an order of **2 or more tickets** requires details
for each attendee — first name, last name, National ID, email and phone. The
forms appear on the checkout screen, one per ticket, and are validated before
the order is created. They're submitted as `items[].attendees[]` and stored on
the order item; the name is printed on that ticket and the ID is checked at the
gate. Single-ticket orders are issued to the buyer with no extra forms.

### Backing services must be running

```powershell
# 1. Postgres (not a Windows service — start it manually after a reboot)
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\Users\user\pgdata-ticketflow" -l "C:\Users\user\pgdata-ticketflow\server.log" -o "-p 5433" start

# 2. Backend
cd backend
npm run seed        # first run only — creates accounts + the 6 events
npm run start:dev
```

Sign in with a seeded customer account — orders are created against the JWT's
user, so ticket ownership and scanning need a real account. Use
**`customer2@ticketflow.co.ke` / `Customer@123`**.

> `customer1@ticketflow.co.ke` does **not** exist: `silasbarack5@gmail.com`
> already holds the phone number the seed assigns it, so `npm run seed` skips
> that row ("unique constraint already taken (phone)"). Either use `customer2`
> or free up the phone number.

Also note the seeded events run **1–29 August 2026** and the backend rejects
orders for events that have already started, so the earliest ones expire as
time passes. Pick a future event when testing.

> **Commission models differ between modes.** Mock mode has the organizer
> absorb the 9% (buyer pays exactly the ticket price); the live backend adds it
> on top as a buyer-paid service fee (`totalAmount` = subtotal + fee). The
> checkout summary now reads its wording from `BUYER_PAYS_SERVICE_FEE`
> (`src/utils/currency.ts`) so it describes whichever model is active, and the
> app always charges `order.totalPayable` from the backend.

## Running on a physical Android phone

1. Install **Expo Go** from the Play Store.
2. Make sure your phone and computer are on the same Wi-Fi network.
3. From `mobile/`, run `npx expo start`.
4. Scan the terminal/browser QR code with the Expo Go app.
5. (Real-API mode only) Confirm `EXPO_PUBLIC_API_URL` points at your machine's LAN IP as described above, and that your backend's CORS/host binding allows LAN connections (`0.0.0.0`, not just `127.0.0.1`).

## Project structure

```
app/                          Expo Router routes (file-based)
  _layout.tsx                 Root Stack, auth-gated via Stack.Protected
  index.tsx                   Startup redirect (auth → tabs, else → onboarding/login)
  (auth)/                     login, register, forgot-password, verify-email
  (tabs)/                     home, tickets, notifications, profile — bottom tab bar
  events/[eventId].tsx        Event details + ticket tier picker
  checkout/[eventId].tsx      Buyer details + order summary → creates the order
  payment/[orderId].tsx       M-Pesa STK push trigger + status polling
  ticket/[ticketId].tsx       QR ticket, download/share
  scanner/index.tsx           Staff-only QR validation (hidden from the tab bar)

src/
  components/                 Reusable UI (AppButton, AppInput, EventCard, TicketCard, ...)
  constants/                  colors.ts, spacing.ts, config.ts (incl. USE_MOCK_DATA)
  data/mock-events.ts         6 seeded Kenyan events for mock mode
  hooks/                      useAuth, useEvents, useNetworkRequest (data-fetching pattern)
  services/                   One file per API resource; each exports mock-or-real
  stores/                     Zustand: auth.store, checkout.store, app.store
  types/                      Zod schemas + inferred TS types per domain model
  utils/                      currency, date, phone, validation, errors
```

## Current limitations

- **Mock data only, by default.** `USE_MOCK_DATA = true` — no requests hit any backend until you flip it and configure `EXPO_PUBLIC_API_URL`.
- **No push notifications.** The Notifications tab reads from `notificationsService` (mock or REST); there's no `expo-notifications` integration yet. The data model and screen are ready for it — just no device token registration or remote delivery.
- **Scanner needs an event picker.** Check-in is scoped to one event, and there is no "events I can scan" endpoint, so the scanner lists published events and asks staff to pick one before the camera opens. `POST /checkins/scan` is also `ORGANIZER`-only on the backend, so an `ADMIN` account currently gets a 403 there.
- **No automated tests.** Verification is `tsc --noEmit` + `expo-doctor` + `expo lint` + manual walkthroughs in Expo Go, consistent with the rest of this repo.
- **Email verification is a stub.** The backend has no verification concept (no `emailVerified` column), so mapped users are reported as verified and `(auth)/verify-email.tsx` is never used as a blocking gate.
- **No password-reset deep link.** `POST /auth/forgot-password` is wired up and returns its neutral message, but the emailed reset link opens the web app; there's no in-app reset screen.

### How the app maps onto the real API

The real service layer targets the endpoints that actually exist in `../backend`:

| App operation | Backend endpoint | Notes |
|---|---|---|
| Login / register / session | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` | Returns `{ accessToken, user }`; no refresh token, so a 401 ends the session |
| Browse / search events | `GET /events`, `GET /events/:id` | Category chips filter client-side; `featured` is derived from `isFeatured` |
| Create order | `POST /orders` | Buyer comes from the JWT; backend computes the authoritative totals |
| M-Pesa STK push | `POST /payments/mpesa/stk-push` | Body is `{ orderId, phone }` |
| Payment polling | `GET /payments/:id` | Polled by the backend's payment id, not Safaricom's `CheckoutRequestID` |
| Dev confirmation | `POST /payments/mock/:paymentId/success` | Requires `ENABLE_MOCK_PAYMENTS=true` |
| My tickets / one ticket / PDF | `GET /tickets/my`, `GET /tickets/:id`, `GET /tickets/:id/pdf` | QR arrives as a rendered PNG data URL and is displayed as-is |
| Scanner validation | `POST /checkins/scan` | Outcomes come back as HTTP errors and are mapped to the scanner's result states |

## Migrating from Expo Go to a production build

Nothing in this app currently requires custom native code, so Expo Go is sufficient for all development so far. When you're ready for features Expo Go can't do (push notifications, further native modules, app store distribution), move to an Expo **development build**:

```bash
npx expo install expo-dev-client
npx eas build --profile development --platform android
```

Install the resulting `.apk` once, then keep using `npx expo start` for fast refresh during development — no more Expo Go needed.

### EAS production build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

Set `EXPO_PUBLIC_API_URL` for production via `eas.json` build profile `env`, not by editing `.env` — never commit production secrets or URLs into the repo. Before shipping, confirm `USE_MOCK_DATA = false` and that all payment/QR endpoints point at the real backend.

## Security notes for production configuration

These are the things a reviewer should re-check before this app goes anywhere near real money or real attendees:

- **Never trust client totals.** `src/utils/currency.ts#calculateOrderTotals` is explicitly documented as an estimate; the backend recalculates and is authoritative. Don't wire the checkout screen to trust a client-sent total.
- **No payment secrets in the app.** M-Pesa consumer secret/passkey, JWT signing secret, DB credentials, etc. must never be set as `EXPO_PUBLIC_*` — those are bundled into the client and are effectively public.
- **Tickets are only "real" after backend confirmation.** The payment screen polls `paymentsService.getStatus()` and only navigates to a ticket once the backend reports a terminal `PAID` status with `ticketIds` — it never fabricates a ticket client-side.
- **QR tokens are credentials.** `ticket.qrToken` is the only thing encoded in the QR — never the holder's name, email, or any other PII. Treat it as a secret in logs/analytics.
- **Scanner is role-gated in the UI only.** `app/scanner/index.tsx` checks `user.role !== 'CUSTOMER'` client-side. This is a UX gate, not a security boundary — the backend's `/checkins/*` (or equivalent) endpoints must independently enforce role checks, since a modified client could skip the UI check entirely.
- **Logout clears SecureStore + in-memory session state** (`auth.store.ts#logout`) but intentionally leaves `app.store.ts` (onboarding-seen flag) untouched — that's a non-sensitive UI preference, not session data.
