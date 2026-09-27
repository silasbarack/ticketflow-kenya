-- Realistic ticket ladders for the nine calendar events.
--
-- Migration 20260926090000 gave each of these events a single tier (the price
-- the calendar listed). They now get a full ladder — early bird, regular,
-- group, student/child, VIP and VVIP where it suits the event — sold on
-- TicketFlow. The originally listed tier keeps its id, name and price. Group
-- tiers state that their price covers the whole group.
--
-- Stock follows the seed's allocation per category (EARLY_BIRD 150,
-- REGULAR 400, STUDENT 200, VIP 150, VVIP 60); tiers marked SOLD_OUT get
-- none. Sales-end times are stored in UTC (EAT - 3h). On a re-run the
-- allocation never drops below what has already been sold.

WITH tier_data (id, event_slug, name, category, price, quantity, availability, description, sales_end) AS (
  VALUES
    ('20000000-0000-4000-8000-000000000033', 'miles-of-melody-where-rhythm-roams-2026', 'Entry ticket', 'REGULAR', 1000, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000042', 'miles-of-melody-where-rhythm-roams-2026', 'Early bird entry', 'EARLY_BIRD', 700, 0, 'SOLD_OUT', NULL, NULL),
    ('20000000-0000-4000-8000-000000000043', 'miles-of-melody-where-rhythm-roams-2026', 'Couple entry', 'REGULAR', 1800, 400, 'AVAILABLE', 'Total price for a group of 2; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000044', 'miles-of-melody-where-rhythm-roams-2026', 'VIP — front seating & signed vinyl', 'VIP', 3000, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000034', 'africa-concours-delegance-2026', 'Advance adult', 'REGULAR', 1800, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000045', 'africa-concours-delegance-2026', 'Child (6–12 years)', 'STUDENT', 500, 200, 'AVAILABLE', 'Children under 6 enter free with a paying adult.', NULL),
    ('20000000-0000-4000-8000-000000000046', 'africa-concours-delegance-2026', 'Family pass — 2 adults & 2 children', 'REGULAR', 4500, 400, 'AVAILABLE', 'Total price for a group of 4; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000047', 'africa-concours-delegance-2026', 'VIP enclosure — lunch & grandstand', 'VIP', 7500, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000048', 'first-rhumba-vip-affair-2026', 'Early bird VIP', 'EARLY_BIRD', 2500, 0, 'SOLD_OUT', NULL, NULL),
    ('20000000-0000-4000-8000-000000000035', 'first-rhumba-vip-affair-2026', 'VIP ticket', 'VIP', 3000, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000049', 'first-rhumba-vip-affair-2026', 'VIP couple', 'VIP', 5500, 150, 'AVAILABLE', 'Total price for a group of 2; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000050', 'first-rhumba-vip-affair-2026', 'VVIP table for 4 — with bottle', 'VVIP', 20000, 60, 'AVAILABLE', 'Total price for a group of 4; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000036', 'safari-7s-2026', 'Friday regular', 'REGULAR', 300, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000051', 'safari-7s-2026', 'Saturday regular', 'REGULAR', 1000, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000052', 'safari-7s-2026', 'Sunday regular', 'REGULAR', 1000, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000053', 'safari-7s-2026', 'Weekend pass (Fri–Sun)', 'REGULAR', 2000, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000054', 'safari-7s-2026', 'Student weekend pass', 'STUDENT', 1200, 200, 'AVAILABLE', 'Valid student ID required at the gate.', NULL),
    ('20000000-0000-4000-8000-000000000055', 'safari-7s-2026', 'VIP weekend pass — covered stand', 'VIP', 7500, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000056', 'safari-7s-2026', 'VVIP hospitality — per person, all weekend', 'VVIP', 15000, 60, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000037', 'kulture-icons-soundtrack-2026', 'Zone H', 'REGULAR', 2000, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000057', 'kulture-icons-soundtrack-2026', 'Zone E', 'REGULAR', 3500, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000058', 'kulture-icons-soundtrack-2026', 'Zone C — lower tier', 'VIP', 6000, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000059', 'kulture-icons-soundtrack-2026', 'Gold — Zone A front rows', 'VIP', 10000, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000060', 'kulture-icons-soundtrack-2026', 'Platinum table for 6 — red carpet & dinner', 'VVIP', 60000, 60, 'AVAILABLE', 'Total price for a group of 6; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000061', 'pineapple-party-nairobi-2026', 'Early bird', 'EARLY_BIRD', 1000, 0, 'SOLD_OUT', NULL, NULL),
    ('20000000-0000-4000-8000-000000000038', 'pineapple-party-nairobi-2026', 'Entry', 'REGULAR', 1500, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000062', 'pineapple-party-nairobi-2026', 'Squad of 4', 'REGULAR', 5000, 400, 'AVAILABLE', 'Total price for a group of 4; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000063', 'pineapple-party-nairobi-2026', 'VIP — lounge access', 'VIP', 3500, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000064', 'pineapple-party-nairobi-2026', 'VIP table for 6 — with bottle', 'VVIP', 25000, 60, 'AVAILABLE', 'Total price for a group of 6; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000065', 'midnight-royale-2026', 'Early bird', 'EARLY_BIRD', 1000, 150, 'AVAILABLE', NULL, '2026-10-05 20:59:00'),
    ('20000000-0000-4000-8000-000000000039', 'midnight-royale-2026', 'Entry', 'REGULAR', 1500, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000066', 'midnight-royale-2026', 'Group of 5', 'REGULAR', 6500, 400, 'AVAILABLE', 'Total price for a group of 5; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000067', 'midnight-royale-2026', 'VIP', 'VIP', 4000, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000068', 'midnight-royale-2026', 'VVIP — backstage & open bar', 'VVIP', 8000, 60, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000069', 'teen-pop-up-festival-2026', 'Early bird', 'EARLY_BIRD', 200, 150, 'AVAILABLE', NULL, '2026-10-10 20:59:00'),
    ('20000000-0000-4000-8000-000000000040', 'teen-pop-up-festival-2026', 'Entry', 'REGULAR', 250, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000070', 'teen-pop-up-festival-2026', 'Friends pack of 5', 'REGULAR', 1000, 400, 'AVAILABLE', 'Total price for a group of 5; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000071', 'teen-pop-up-festival-2026', 'Parent / guardian pass', 'REGULAR', 500, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000072', 'teen-pop-up-festival-2026', 'VIP — fast-track entry & goodie bag', 'VIP', 800, 150, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000073', 'ai-build-day-2nd-edition-2026', 'Early bird', 'EARLY_BIRD', 600, 150, 'AVAILABLE', NULL, '2026-10-20 20:59:00'),
    ('20000000-0000-4000-8000-000000000041', 'ai-build-day-2nd-edition-2026', 'Entry', 'REGULAR', 800, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000074', 'ai-build-day-2nd-edition-2026', 'Student', 'STUDENT', 400, 200, 'AVAILABLE', 'Valid student ID required at check-in.', NULL),
    ('20000000-0000-4000-8000-000000000075', 'ai-build-day-2nd-edition-2026', 'Professional — with lunch', 'REGULAR', 1500, 400, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000076', 'ai-build-day-2nd-edition-2026', 'Team of 4 — build track', 'REGULAR', 2800, 400, 'AVAILABLE', 'Total price for a group of 4; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000077', 'ai-build-day-2nd-edition-2026', 'VIP — workshop seat & speaker dinner', 'VIP', 3500, 150, 'AVAILABLE', NULL, NULL)
)
INSERT INTO "ticket_types" (
  "id", "eventId", "name", "category", "price", "quantity", "quantitySold",
  "availabilityStatus", "description", "salesStart", "salesEnd", "createdAt", "updatedAt"
)
SELECT
  td.id, e.id, td.name, td.category::"TicketTypeCategory",
  td.price::DECIMAL(10, 2), td.quantity, 0,
  td.availability::"TicketAvailabilityStatus", td.description, NULL,
  td.sales_end::TIMESTAMP(3), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM tier_data td
JOIN "events" e ON e."slug" = td.event_slug
-- A database seeded before this migration already has these tiers under
-- generated ids; don't create a second copy of them.
WHERE NOT EXISTS (
  SELECT 1 FROM "ticket_types" x
  WHERE x."eventId" = e."id" AND x."name" = td.name AND x."id" <> td.id
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "price" = EXCLUDED."price",
  "quantity" = GREATEST(EXCLUDED."quantity", "ticket_types"."quantitySold"),
  "availabilityStatus" = EXCLUDED."availabilityStatus",
  "description" = EXCLUDED."description",
  "salesEnd" = EXCLUDED."salesEnd",
  "updatedAt" = CURRENT_TIMESTAMP;
