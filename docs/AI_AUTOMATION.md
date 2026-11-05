# TicketFlow Kenya — AI & Automation

This document covers the AI and automation layer added on top of the existing platform: what was audited, what was built, how it is governed, and how to deploy it. Everything here describes the code as it is in this branch. Section 9 lists what is **not** implemented.

## 1. Audit summary (before this work)

| Area | Found |
|---|---|
| Stack | NestJS 10 + Prisma 5 + PostgreSQL backend, Next.js 14 App Router + Tailwind frontend, deployed on Render's free tier |
| Payments | M-Pesa STK Push via Daraja (`mpesa.service.ts`), with callback handling, status-query reconciliation (`reconcile`), a 30 s sweep, per-order initiation lock, and conditional state transitions. This was already mature. |
| Tickets | QR codes HMAC-signed at issuance, PDF + email delivery, check-in by QR or manual code |
| Identity | Persona inquiries for the organiser's representative, with a signed and deduplicated webhook; admin KYB review |
| Scheduled jobs | `@nestjs/schedule`: payment sweep, tax jobs, password-reset cleanup. No queue, retries or dead-letter handling. |
| AI | None |
| Tests | Jest: payment state machine, tax, event bookability. (`CLAUDE.md` said there were none.) Two tax integration tests already failed before this work because they need seeded orders. |

### Security findings, all fixed in this branch

| Severity | Finding | Fix |
|---|---|---|
| **Critical** | `POST /payments/mpesa/callback` was public and unauthenticated, and the buyer-facing status view returned the `checkoutRequestId`. A buyer could post `ResultCode: 0` for their own pending payment and receive tickets without paying. The callback `Amount` was never checked. | The callback now requires a URL token (`MPESA_CALLBACK_TOKEN`), with an optional IP allowlist. If no token is configured, every callback is confirmed with Daraja's `stkpushquery` before it can settle a payment. Success callbacks are rejected if the amount doesn't match or the receipt number is reused. Daraja request ids and raw callbacks are no longer returned to buyers. |
| **High** | `GET /tickets/code/:code` let any signed-in user read any ticket, including the buyer's full `User` row with its `passwordHash`. `GET /tickets/:id` and `/tickets/:id/pdf` let any organiser read tickets for any event. | Shared `assertCanAccessTicket`: only the holder, the event's own organiser, or an admin. The user row is reduced to the fields that are needed. |
| **High** | QR scans never checked the signature. `TICKET_QR_SECRET` was missing from `render.yaml`, so production signed with the constant `'tfk-default-secret'`. | Scans are verified in constant time against each ticket's stored signature, so existing tickets keep working. The signing key falls back to a key derived from `JWT_SECRET`, never a constant. `render.yaml` now generates `TICKET_QR_SECRET`. |
| Medium | Two gates scanning the same ticket at the same moment hit the unique constraint and returned a 500. Check-in didn't require a paid order. | Check-in is claimed conditionally (`status = ACTIVE`) and duplicates get a clean "already checked in". A paid order is required, and duplicate or forged scans are audit-logged. |
| Medium | `generateForOrder` could be called for an unpaid order, and a crash mid-issue left a partial set of tickets. | Issuing tickets requires `order.status = PAID` and runs in one transaction under a per-order advisory lock. |
| Medium | A late success after a buyer had retried and paid charged the order twice, with no signal. Ticket emails that failed were never retried. | `PAYMENT_DOUBLE_CHARGE` and `TICKET_TIER_OVERSOLD` alerts are raised. A ticket-delivery sweep with retrying jobs resends failed emails. |
| Low | The public `/tickets/verify/:code` endpoint exposed the holder's email. | Removed. The scanner never used it. |

## 2. What was built

### Phase 1: Foundation
- **AI service** (`backend/src/ai/`): a provider-independent `AiProvider` interface with an Anthropic implementation (official SDK, structured output through `output_config.format` with Zod, `fallbacks: "default"` for refusals, SDK retries with backoff). Every call goes through `AiService.generate`, which does the following in order:
  1. Checks the global switch (`AI_ENABLED`), whether the provider is configured, and whether an admin has enabled the feature.
  2. Enforces per-feature daily, per-user daily and monthly USD budget limits.
  3. **Re-validates the output with Zod**, whatever the provider claims.
  4. Logs tokens, cost, latency and status to `ai_usage_logs`. **Prompts and responses are never stored.**
- **Prompt safety** (`ai-safety.ts`): redacts phone numbers, emails, M-Pesa receipts and long ID-like numbers; screens messages for prompt injection; wraps untrusted text in labelled `<untrusted>` blocks. The model has no tools and no write authority anywhere.
- **Automation engine** (`backend/src/automation/`): a Postgres-backed durable queue. It has idempotent enqueue (unique key), `FOR UPDATE SKIP LOCKED` claiming, exponential backoff with jitter, DEAD (dead-letter) after `maxAttempts`, recovery of stale RUNNING jobs, and admin retry/cancel. There is no Redis, which suits Render's free tier.
- **Operational alerts**: deduplicated, never reopened once an admin closes them, and closing requires a written note that is audit-logged. CRITICAL alerts email `ADMIN_ALERT_EMAILS` through the queue.
- **Admin AI Settings**: per-feature toggles, request limits, monthly budget, and a usage and cost dashboard.

### Phase 2: Customer-facing productivity
- **AI Event Assistant** (on the create-event page): turns the organiser's notes into a description, summary, agenda (relative slots, no clock times), FAQs, SEO text, tier *names* and headlines, in English and Kiswahili. The organiser can generate, regenerate, edit (validated server-side), accept or discard.
  - Accepting only fills the form's description. The organiser still saves it, and admin approval still applies.
  - The schema has no fields for prices, dates or publishing.
  - A server-side claim check flags invented amounts, discounts, sponsors, performers and clock times.
- **AI Marketing Studio** (`/organizer/marketing`): TikTok, Instagram, Facebook, WhatsApp Business, email, SEO and CTA copy, plus campaign ideas.
  - It is grounded in the organiser's own event records (title, date, venue, real tier prices, whether sales are open). Organisers can't use another organiser's event.
  - It runs the same claim checks as the Event Assistant.
  - **Nothing is sent automatically.** The draft says delivery needs an authorised provider, recipient opt-in and organiser approval.
- **AI Support Assistant** (floating Help button on every page except admin and checkout):
  - Answers are grounded in a help centre restated from the published policy pages (`support/help-centre.ts`) and in published upcoming events with live availability.
  - For signed-in users it can see **their own** last five orders, fetched by our code and never requested by the model.
  - Output checks replace any payment confirmation or refund promise that the user's records don't support, drop external links and drop invented event ids.
  - "Mark my order as paid"-style requests get a fixed refusal without calling the model.
  - If AI is off or the provider is down, it falls back to keyword answers from the help centre.
  - Visitors' conversations are protected by an access token; signed-in users keep their history. Users can rate answers and escalate to a support ticket (an order is only attached if the user owns it). Payment tickets also raise an alert.
  - Transcripts are purged after `SUPPORT_RETENTION_DAYS`.
  - **Admin Support page**: tickets (a note is required to resolve), conversations flagged by input screening, answers rated unhelpful, and agent replies.

### Phase 3: Operational reliability
- **Payment monitor** (every 5 min):
  - Re-issues tickets for PAID orders with a SUCCESS payment but no tickets. This only re-runs the idempotent issuance the payment rules already guarantee.
  - Queues ticket emails that never went out.
  - Flags missing commission rows, payments stuck PENDING past hard expiry, and platform-wide failure spikes.
  - **It never changes a payment's status.**
- **Payment failure notice**: sent only for a genuine `FAILED` payment (not cancelled or expired). It is delayed 5 minutes and skipped if the buyer has retried or paid.
- **Event reminders**: one email per paid order, about 24 h before the event (idempotent per order).
- **Verification automation** (hourly):
  - Syncs Persona status for open inquiries. Persona stays authoritative, and each change is audit-logged as `VERIFICATION_STATUS_SYNCED`.
  - Sends a weekly reminder to organisers whose application is incomplete or needs changes.
  - Raises an alert for applications that have waited more than 48 h for review.
  - Organisers get a deterministic explanation at `GET /organizers/me/verification/explanation`, built only from Persona's and the reviewer's recorded results. **Identity data is never sent to an AI model.**

### Phase 4: Advanced intelligence
- **Sales Insights** (`/organizer/insights`):
  - Tickets sold, gross sales, earnings, service fees, refunded and cancelled tickets, check-ins, a funnel starting at order creation (page views aren't tracked), per-tier sell-through and 60 days of daily sales. **All of it comes from database records.**
  - Sales forecast: a run-rate over the last 14 days with an ~80% band, capped at remaining capacity. It refuses to forecast with less than 7 days of history.
  - Attendance forecast: uses the organiser's past check-in rates and needs at least 2 past events with 10+ tickets.
  - Low-sales alert: under 25% sold within 14 days of the event.
  - The AI narrative only explains these figures and is labelled as AI.
- **Risk monitoring** (every 10 min, rules only, thresholds set by `RISK_*` env vars): duplicate QR scans, counterfeit QR signatures, excessive payment failures, order velocity, abusive unpaid checkouts, bulk holdings for resale, unusual organiser event creation and repeated refund requests. Each rule raises an alert for manual review. **Nothing is banned, cancelled, frozen or rejected automatically.**
- **Recommendations** (`/events` "Picked for you" / "Trending"):
  - Transparent scoring with stated reasons, over real published upcoming events only.
  - Visitors who aren't signed in get popularity and timing.
  - Viewing and purchase history is used **only with explicit consent** (`/settings/discovery`). Explicit category and city choices are always honoured. Withdrawing consent deletes the viewing history.
- **Admin AI Operations** (`/admin/ai-operations`):
  - Live daily and weekly metrics and an AI-written report. It is read-only and its suggested actions are only suggestions.
  - Alert review with an AI explanation that never changes the alert, and documented decisions.
  - A unified automation activity feed, and a background jobs and dead-letter view with retry.
  - Buttons to run each monitor on demand.

## 3. Files

**Backend: new**
- `src/ai/`: `ai.module.ts`, `ai.service.ts`, `ai-features.ts`, `ai-pricing.ts`, `ai-safety.ts`, `ai-admin.controller.ts`, `ai-public.controller.ts`, `dto/update-ai-setting.dto.ts`, `providers/{ai-provider.interface,anthropic.provider,unconfigured.provider}.ts`
- `src/automation/`: `automation.module.ts`, `automation-queue.service.ts`, `operational-alerts.service.ts`, `automation-handlers.service.ts`, `payment-monitor.service.ts`, `event-reminder.service.ts`, `verification-automation.service.ts`, `risk-monitor.service.ts`, `automation-activity.service.ts`, `automation-admin.controller.ts`, `organizer-verification-insight.controller.ts`, `job-types.ts`, `dto.ts`
- `src/ai-assist/`: `ai-assist.{module,controller,service,dto}.ts`, `ai-drafts.service.ts`, `sales-analytics.service.ts`, `schemas.ts`
- `src/support/`: `support.{module,controller,service,dto}.ts`, `help-centre.ts`
- `src/discovery/`: `discovery.{module,controller,service}.ts`
- `prisma/migrations/20261104122425_ai_automation_foundation/`
- `test/ai-automation/`: `ai-automation.integration.spec.ts`, `units.spec.ts`, `helpers.ts`

**Backend: modified**: `app.module.ts`, `payments/{payments.service,payments.controller,payment-status}.ts`, `tickets/{tickets.service,tickets.controller}.ts`, `checkins/{checkins.service,checkins.module}.ts`, `email/email.service.ts` (new `sendNotificationEmail`, which throws so jobs can retry), `prisma/schema.prisma`, `test/payments/stk-push-flow.spec.ts`, `package.json` (`@anthropic-ai/sdk`, `zod`), `.env.example`

**Frontend: new**: `app/organizer/{insights,marketing}/page.tsx`, `app/admin/{ai-operations,ai-settings,support}/page.tsx`, `app/settings/discovery/page.tsx`, `components/ai/{AiBits,EventAssistantPanel}.tsx`, `components/{SupportChat,RecommendedEvents}.tsx`, `lib/{ai,organizer-nav}.ts`

**Frontend: modified**: `app/layout.tsx` (mounts SupportChat), `app/organizer/events/create/page.tsx` (assistant panel), the organiser pages (shared `ORGANIZER_NAV`), `lib/admin-nav.ts`, `app/events/page.tsx`, `app/events/[id]/EventDetailClient.tsx` (consent-gated view recording), `components/UserMenu.tsx`, `app/checkout/[orderId]/payment/page.tsx` and `types/index.ts` (`stkSent` replaces `checkoutRequestId`)

**Other**: `render.yaml`, `docs/AI_AUTOMATION.md`, `CLAUDE.md`

## 4. Database migration

`20261104122425_ai_automation_foundation` is **purely additive**. It creates ten tables (`ai_feature_settings`, `ai_usage_logs`, `ai_drafts`, `automation_jobs`, `operational_alerts`, `support_conversations`, `support_messages`, `support_tickets`, `user_preferences`, `event_views`) and adds one index on `payments.mpesaReceiptNumber`. No existing column changes.

Prisma's diff also proposed dropping `tax_rules.effective_range`, a raw-SQL column it can't model. That statement was deliberately removed from the migration. Watch for it in future `prisma migrate dev` runs too.

## 5. Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `AI_ENABLED` | `false` | Global AI switch. Features also need an admin toggle. |
| `AI_FEATURES_ENABLED` | (none) | Features on by default: `all` or a comma-separated list (e.g. `SUPPORT_CHAT,EVENT_ASSISTANT`). A setting saved in AI Settings overrides it. |
| `AI_PROVIDER` | `anthropic` | Provider selection. Unknown values fail closed. |
| `ANTHROPIC_API_KEY` | (none) | Server-side only, never exposed to the browser |
| `AI_MODEL` | `claude-opus-5-5` | Model id |
| `AI_TIMEOUT_MS` / `AI_MAX_RETRIES` | `60000` / `2` | SDK timeout and retries |
| `AI_COST_INPUT_PER_MTOK` / `AI_COST_OUTPUT_PER_MTOK` | (none) | Pricing for models not in `ai-pricing.ts` |
| `MPESA_CALLBACK_TOKEN` | (none) | **Set it**, and append `?token=<value>` to `MPESA_CALLBACK_URL` |
| `MPESA_CALLBACK_ALLOWED_IPS` | (none) | Optional source allowlist (needs `TRUST_PROXY`) |
| `MPESA_CALLBACK_REQUIRE_QUERY_CONFIRMATION` | `false` | Also confirm authenticated callbacks with the status query |
| `TICKET_QR_SECRET` | derived from `JWT_SECRET` | Now generated in `render.yaml` |
| `AUTOMATION_WORKER_ENABLED` / `AUTOMATION_MONITORS_ENABLED` / `EVENT_REMINDERS_ENABLED` | `true` | Kill switches |
| `ADMIN_ALERT_EMAILS` | (none) | Recipients for CRITICAL alert emails |
| `SUPPORT_RETENTION_DAYS` | `180` | How long chat transcripts are kept |
| `RISK_*` | see `.env.example` | Risk-rule thresholds |

## 6. Tests

Run from `backend/`:

```bash
npx jest test/payments test/ai-automation/units.spec.ts             # no DB needed
TEST_DATABASE_URL=postgresql://…/ticketflow_test npx jest test/ai-automation --runInBand
```

Results on this branch, against Postgres 16:
- `test/payments`: **29/29** (18 existing + 11 new). The new tests cover: missing or wrong token ignored, IP allowlist, tokenless callbacks settled only on Daraja's answer, forged success contradicted by Daraja flagged and not honoured, amount mismatch, reused receipt, late success flagged, duplicate callbacks processed once, failure notice only for genuine failures, and no client-reported success.
- `test/ai-automation/units.spec.ts`: **22/22**. Covers redaction, injection screening, untrusted-block escaping, cost estimation, claim checks, support output checks, forecast refusal and capping, recommendations, backoff and the verification explanation.
- `test/ai-automation/ai-automation.integration.spec.ts`: **35/35**. Runs through the real Nest app and HTTP with a fake model. Covers:
  - concurrent ticket issuance, and refusal to issue for unpaid orders
  - ticket isolation between customers and organisers, and no `passwordHash` leak
  - forged QR rejected, concurrent scans admitting once, cross-organiser scans refused
  - forged HTTP callback ignored, no Daraja ids returned to buyers
  - AI disabled by default, admin-only settings
  - drafts with warnings, accept not touching events, draft ownership
  - schema rejection, provider outage, per-user limit, budget limit, usage logged without prompts
  - marketing isolation and grounding
  - analytics totals and isolation
  - support: help-centre fallback, injection refusal, own-orders-only grounding, link sanitising, fabricated confirmation replaced, anonymous conversation access, escalation and admin resolution
  - queue: idempotency, backoff, dead letter, admin retry, stale-job recovery
  - verification alert decision workflow
  - AI alert explanation not changing the alert
  - recommendations limited to published events, consent-gated views
- Full suite: **166 passed, 2 failed**. The 2 failures are the pre-existing `tax-workflows.spec.ts` cases that fail the same way on the base branch.
- The frontend type-checks, lints and passes `next build`. The new screens were checked in Chromium at desktop width and on an iPhone 13 profile.

No real M-Pesa transactions or real AI calls were made. Daraja and the model are stubbed in tests.

## 7. AI provider and cost

- The default model is `claude-opus-5-5` at list prices of $4 input / $20 output per million tokens. Change it with `AI_MODEL`; a cheaper model such as `claude-haiku-5-5` ($0.10 / $0.50) may be enough for support chat, but measure the quality first.
- Rough token use per request is 1.5–3k input and 0.5–3k output, depending on the feature.
- At Opus 5.5 prices that is about **$0.02–$0.07 per generation**. For example, 1,000 support answers a month cost roughly $25–$50.
- Each feature has its own monthly USD budget (default $25) and daily request limits, all editable in AI Settings. Costs are estimated from list prices; the provider's invoice is authoritative.
- The Anthropic SDK retries 429 and 5xx responses. An outage degrades each feature gracefully (support falls back to the help centre, organiser tools show an "unavailable" state).

## 8. Privacy (Kenya Data Protection Act 2019)

- **Data minimisation.**
  - Prompts carry event facts, aggregates and redacted user text.
  - Support prompts include only the signed-in user's own order summaries (order number, event, status and ticket count), never contact details.
  - Identity documents, selfies and Persona results never reach a model.
- **No prompt or response logging.** Usage logs hold counts and cost only. Drafts store the organiser's own input and the validated output they asked for.
- **Consent.** Personalised recommendations are opt-in, and withdrawing consent erases viewing history. Marketing delivery requires recipient opt-in and is not automated.
- **Retention.** Support transcripts are purged after 180 days, except those linked to open tickets.
- Note that AI prompts are processed by the configured provider. Mention this in the privacy policy before enabling AI in production. The policy page was not changed in this branch.

## 9. Not implemented, or limited

- **Automated message delivery** (WhatsApp Business, SMS, bulk email): not built. No authorised provider is integrated, and recipient opt-in management doesn't exist yet.
- **Refund workflow**: none exists in the codebase (only a `REFUNDED` ticket status). Refund requests arrive as support tickets, and the refund risk rule counts those.
- **Real AI output quality**: not evaluated, because no API key was available here. Prompts, schemas and output checks are tested against a fake provider only. Run real-model evaluations in a staging environment before enabling each feature.
- **Persona sync**: tested only against the code path (`refreshInquiryStatus`), not live Persona.
- **Limit enforcement**: approximate under concurrency. Two simultaneous requests can both pass the last free slot, so a limit can be overshot by one or two calls.
- **Job delivery**: at-least-once. A crash after an email is sent but before the job is marked complete resends it. The admin-alert email to several recipients can repeat for earlier recipients on retry.
- **Daily sales series**: uses `orders.updatedAt` as the payment time, since there is no `paidAt` column.
- **UI behaviour**:
  - The support widget is hidden on `/admin` and `/checkout`.
  - On phones it sits behind the cookie banner until the banner is dismissed.
- **Pre-existing tooling gap**: the backend has no ESLint config, so `npm run lint` in `backend/` errors. This was already the case before this work.
- **End-to-end tests**: no browser e2e suite. The UI was checked manually with Playwright screenshots.

## 10. Deployment

1. Merge after review. Render runs `prisma migrate deploy` on boot, which applies the additive migration.
2. In the Render dashboard for `ticketflow-backend`:
   1. Set `MPESA_CALLBACK_TOKEN` to a long random value.
   2. Change `MPESA_CALLBACK_URL` to `…/api/payments/mpesa/callback?token=<same value>`.
   3. Do both together. If only the token is set, callbacks are rejected and payments settle more slowly through the 30 s reconciliation sweep.
3. Confirm `TICKET_QR_SECRET` was generated. Existing tickets still scan because each one is checked against its stored signature.
4. Optionally set `ADMIN_ALERT_EMAILS`.
5. To enable AI:
   1. Set `ANTHROPIC_API_KEY` and `AI_ENABLED=true`.
   2. Sign in as an admin and open **AI Settings**.
   3. Turn on one feature at a time, with conservative limits.
   4. Watch usage and cost there.
6. Watch **Admin → AI Operations** for alerts after the first deploy. The payment monitor may surface historical discrepancies, such as missing commission rows.
