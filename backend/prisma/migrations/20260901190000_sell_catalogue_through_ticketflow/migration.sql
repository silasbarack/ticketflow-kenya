-- Sell the September 2026 catalogue through TicketFlow Kenya itself.
--
-- The catalogue was published as EXTERNAL listings that pointed buyers at
-- third-party sellers. Ticketing now happens on TicketFlow only: these events
-- move to INTERNAL booking, sales are switched on, the listings desk is
-- verified so `isEventBookable` passes, and each open tier gets a real
-- allocation so there is stock to reserve.
--
-- Every condition in `isEventBookable` / `OrdersService#create` must hold:
--   status = PUBLISHED, bookingMode = INTERNAL, salesEnabled = true,
--   organizer.isVerified = true, startDateTime in the future, and
--   ticketType.quantity > quantitySold within its sales window.

-- 1. The listings desk becomes a verified seller. Without this every order is
--    rejected with "organizer has not completed verification".
UPDATE "organizer_profiles"
SET
  "companyName" = 'TicketFlow Kenya',
  "description" = 'Events ticketed and sold directly by TicketFlow Kenya.',
  "isVerified" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "userId" IN (
  SELECT "id" FROM "users" WHERE "email" = 'listings@ticketflow.co.ke'
);

-- The listings user was created inactive because it never took money before.
UPDATE "users"
SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" = 'listings@ticketflow.co.ke';

-- 2. Move the catalogue onto TicketFlow checkout and drop the outbound seller
--    links, so no listing can route a buyer off-site.
UPDATE "events"
SET
  "bookingMode" = 'INTERNAL',
  "salesEnabled" = true,
  "bookingUrl" = NULL,
  "organizerName" = 'TicketFlow Kenya',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN (
  'fally-ipupa-live-in-nairobi-2026',
  'roots-n-riddim-2026',
  'too-early-for-birds-wangari-maathai-rerun-2026',
  'peaches-and-cream-2026'
);

-- 3. Give every open tier an allocation. Tiers the catalogue recorded as
--    SOLD_OUT or CLOSED keep zero stock — they are genuinely unavailable, and
--    inventing stock for them would misrepresent the event. Only rows still at
--    zero are touched, so a later hand-set allocation survives a re-run.
UPDATE "ticket_types" tt
SET
  "quantity" = CASE tt."category"
    WHEN 'EARLY_BIRD' THEN 150
    WHEN 'REGULAR'    THEN 400
    WHEN 'STUDENT'    THEN 200
    WHEN 'VIP'        THEN 150
    WHEN 'VVIP'       THEN 60
    ELSE 200
  END,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "events" e
WHERE tt."eventId" = e."id"
  AND e."slug" IN (
    'fally-ipupa-live-in-nairobi-2026',
    'roots-n-riddim-2026',
    'too-early-for-birds-wangari-maathai-rerun-2026',
    'peaches-and-cream-2026'
  )
  AND tt."availabilityStatus" = 'AVAILABLE'
  AND tt."quantity" = 0;
