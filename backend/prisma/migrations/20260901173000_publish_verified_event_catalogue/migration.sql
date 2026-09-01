-- Publish the verified September 2026 external-event catalogue in deployed
-- databases. Production runs `prisma migrate deploy` but intentionally does
-- not run the development seed, so this data migration is required once.

INSERT INTO "users" (
  "id", "email", "phone", "passwordHash", "firstName", "lastName", "role",
  "isActive", "createdAt", "updatedAt"
)
VALUES (
  '00000000-0000-4000-8000-000000000051',
  'listings@ticketflow.co.ke',
  NULL,
  '$2b$12$aPiyxAsjMkoYa4X.2Aw1AOwbDLxn7WNz0J9F1bxQSexxqMuIR7KR2',
  'TicketFlow',
  'Listings',
  'ORGANIZER',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "organizer_profiles" (
  "id", "userId", "companyName", "description", "isVerified", "createdAt", "updatedAt"
)
SELECT
  '00000000-0000-4000-8000-000000000052',
  u."id",
  'TicketFlow Kenya Listings Desk',
  'Editorial event listings. Ticket sales remain with each organizer or authorised external seller.',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users" u
WHERE u."email" = 'listings@ticketflow.co.ke'
ON CONFLICT ("userId") DO UPDATE SET
  "companyName" = EXCLUDED."companyName",
  "description" = EXCLUDED."description",
  "isVerified" = false,
  "updatedAt" = CURRENT_TIMESTAMP;

-- Preserve historical orders and tickets: stale listings are archived rather
-- than deleted.
UPDATE "events"
SET
  "status" = 'COMPLETED',
  "salesEnabled" = false,
  "isFeatured" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN (
  'watamu-ocean-seafood-festival',
  'august-nights-afro-fusion-live',
  'coast-sevens-rugby-festival',
  'nairobi-fintech-ai-summit-2026',
  'sanaa-live-spoken-word-theatre-night',
  'nairobi-coffee-culture-festival',
  'campus-vibe-fest-2026',
  'punchline-live-2026',
  'kisumu-lakeside-cultural-festival-2026',
  'rhumba-and-riddim-nairobi-live-2026',
  'kulture-iii-2026',
  'mombasa-spice-and-seafood-festival-2026',
  'nairobi-digital-economy-summit-2026',
  'naivasha-sundowner-music-festival-2026',
  'uhuru-run-nairobi-half-marathon-2026',
  'jamhuri-family-carnival-2026'
);

WITH event_data (
  id, slug, title, subtitle, description, organizer_name, venue, city, county,
  address, category_slug, start_at, end_at, poster_url, poster_alt,
  poster_source_url, booking_url, verification_source, verification_url,
  secondary_url
) AS (
  VALUES
    (
      '10000000-0000-4000-8000-000000000001',
      'fally-ipupa-live-in-nairobi-2026',
      'Fally Ipupa Live in Nairobi',
      'Fally Ipupa and supporting acts live at Uhuru Gardens',
      'Fally Ipupa performs at Uhuru Gardens with a supporting lineup including Kamo Mphela, Tango Supreme, DJ Maphorisa, DJ Ice, Joe Mfalme and Kodong Klan. The official schedule runs from Saturday afternoon into early Sunday morning.',
      'Ticket Yetu — Radio Africa',
      'Uhuru Gardens',
      'Nairobi',
      'Nairobi',
      'Uhuru Gardens, Langata, Nairobi',
      'music-concerts',
      '2026-09-05 12:00:00',
      '2026-09-06 00:00:00',
      'https://admin.ticketsasa.com/storage/events/August2026/79OurX3VJB-1785932580.jpg',
      'Official promotional poster for Fally Ipupa Live in Nairobi on 5 September 2026 at Uhuru Gardens',
      'https://www.ticketsasa.com/events/fally-ipupa-live-in-nairobi',
      'https://www.ticketsasa.com/events/fally-ipupa-live-in-nairobi',
      'Ticketsasa — current official seller listing',
      'https://www.ticketsasa.com/events/fally-ipupa-live-in-nairobi',
      'https://www.fallyipupalive.com/'
    ),
    (
      '10000000-0000-4000-8000-000000000002',
      'roots-n-riddim-2026',
      'Roots n Riddim',
      'Yussef Dayes, Venna and Elijah Fox in Nairobi',
      'Soul HQ and Nairobi R&B present Yussef Dayes for his debut East African performance, joined by Venna and Elijah Fox at Sk8City Nairobi.',
      'Soul HQ and Nairobi R&B',
      'Sk8City Nairobi',
      'Nairobi',
      'Nairobi',
      '12th Floor, Diamond Plaza 2, Nairobi',
      'music-concerts',
      '2026-09-12 13:00:00',
      '2026-09-12 23:00:00',
      'https://mookh-v3-public.lon1.digitaloceanspaces.com/events/event-featured-1784205723980-j57squ.jpeg',
      'Official illustrated poster for Roots n Riddim in Nairobi on 12 September 2026',
      'https://mookh.com/roots-n-riddim/',
      'https://mookh.com/roots-n-riddim/',
      'Mookh — official seller listing by Nairobi R&B',
      'https://mookh.com/roots-n-riddim/',
      'https://nairobieventsguide.com/upcoming-events/'
    ),
    (
      '10000000-0000-4000-8000-000000000003',
      'too-early-for-birds-wangari-maathai-rerun-2026',
      'Too Early For Birds WANGARĨ MAATHAI RERUN',
      'The ninth edition returns for five Nairobi performances',
      'Too Early For Birds restages its Wangarĩ Maathai production fifteen years after her passing. Five performances run from Friday evening through Sunday night at C. U. Shah Jain Bhavan.',
      'Too Early For Birds / Story Zetu',
      'C. U. Shah Jain Bhavan',
      'Nairobi',
      'Nairobi',
      'C. U. Shah Jain Bhavan, Loresho, Nairobi',
      'arts-theatre',
      '2026-09-25 16:00:00',
      '2026-09-27 19:00:00',
      'https://mookh-v3-public.lon1.digitaloceanspaces.com/events/featured/91f9fe13-9d3e-4b90-baf4-656bf08e8fff/IMG-20260430-WA0009.jpg',
      'Official promotional poster for the Too Early For Birds Wangarĩ Maathai rerun, 25 to 27 September 2026',
      'https://mookh.com/too-early-for-birds-wangari-maathai-rerun/',
      'https://mookh.com/too-early-for-birds-wangari-maathai-rerun/',
      'Mookh — official TEFB Wangarĩ Maathai seller listing',
      'https://mookh.com/too-early-for-birds-wangari-maathai-rerun/',
      'https://news.sanaapost.com/shawry-for-trees-the-shawry-is-back/'
    ),
    (
      '10000000-0000-4000-8000-000000000004',
      'peaches-and-cream-2026',
      'Peaches & Cream',
      'A daytime celebration of soulful African sound',
      'A live music and lifestyle experience at Ngong Race Course and Golf Park, with African R&B, pop and house performances, food, markets and brand activations.',
      'Crispy Life Events',
      'Ngong Race Course and Golf Park',
      'Nairobi',
      'Nairobi',
      'Ngong Race Course and Golf Park, Nairobi',
      'festivals',
      '2026-09-26 11:00:00',
      '2026-09-26 23:00:00',
      'https://mookh-v3-public.lon1.digitaloceanspaces.com/events/featured/2982e52b-592b-4f8d-a60d-c3790708a749/ALL_PEACHES__CREAM_26TH_SEP__1X1_copy.jpg',
      'Official Peaches & Cream event poster listing the 26 September 2026 Nairobi lineup',
      'https://mookh.com/peaches-and-cream/',
      'https://mookh.com/peaches-and-cream/',
      'Mookh — official Peaches & Cream seller listing',
      'https://mookh.com/peaches-and-cream/',
      'https://capitalfm.africa/crispy-life-events-announces-peaches-cream-a-new-daytime-afro-rnb-experience-coming-to-nairobi-on-26th-september/'
    )
)
INSERT INTO "events" (
  "id", "organizerId", "categoryId", "title", "slug", "subtitle",
  "description", "posterUrl", "posterAlt", "posterSourceUrl", "venue", "city",
  "county", "address", "organizerName", "startDateTime", "endDateTime",
  "timezone", "status", "isFeatured", "bookingMode", "bookingUrl",
  "verificationSource", "verificationSourceUrl", "secondaryVerificationSourceUrl",
  "verifiedAt", "salesEnabled", "isDemo", "createdAt", "updatedAt"
)
SELECT
  ed.id,
  op.id,
  ec.id,
  ed.title,
  ed.slug,
  ed.subtitle,
  ed.description,
  ed.poster_url,
  ed.poster_alt,
  ed.poster_source_url,
  ed.venue,
  ed.city,
  ed.county,
  ed.address,
  ed.organizer_name,
  ed.start_at::TIMESTAMP(3),
  ed.end_at::TIMESTAMP(3),
  'Africa/Nairobi',
  'PUBLISHED'::"EventStatus",
  true,
  'EXTERNAL'::"EventBookingMode",
  ed.booking_url,
  ed.verification_source,
  ed.verification_url,
  ed.secondary_url,
  '2026-08-31 21:00:00'::TIMESTAMP(3),
  false,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM event_data ed
JOIN "event_categories" ec ON ec."slug" = ed.category_slug
JOIN "users" u ON u."email" = 'listings@ticketflow.co.ke'
JOIN "organizer_profiles" op ON op."userId" = u."id"
ON CONFLICT ("slug") DO UPDATE SET
  "organizerId" = EXCLUDED."organizerId",
  "categoryId" = EXCLUDED."categoryId",
  "title" = EXCLUDED."title",
  "subtitle" = EXCLUDED."subtitle",
  "description" = EXCLUDED."description",
  "posterUrl" = EXCLUDED."posterUrl",
  "posterAlt" = EXCLUDED."posterAlt",
  "posterSourceUrl" = EXCLUDED."posterSourceUrl",
  "venue" = EXCLUDED."venue",
  "city" = EXCLUDED."city",
  "county" = EXCLUDED."county",
  "address" = EXCLUDED."address",
  "organizerName" = EXCLUDED."organizerName",
  "startDateTime" = EXCLUDED."startDateTime",
  "endDateTime" = EXCLUDED."endDateTime",
  "timezone" = EXCLUDED."timezone",
  "status" = EXCLUDED."status",
  "isFeatured" = EXCLUDED."isFeatured",
  "bookingMode" = EXCLUDED."bookingMode",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "verificationSource" = EXCLUDED."verificationSource",
  "verificationSourceUrl" = EXCLUDED."verificationSourceUrl",
  "secondaryVerificationSourceUrl" = EXCLUDED."secondaryVerificationSourceUrl",
  "verifiedAt" = EXCLUDED."verifiedAt",
  "salesEnabled" = false,
  "isDemo" = false,
  "updatedAt" = CURRENT_TIMESTAMP;

-- These slugs are new external listings and cannot have legitimate TicketFlow
-- orders. The reference checks make the cleanup safe if a database was
-- manually populated before this migration.
DELETE FROM "ticket_types" tt
USING "events" e
WHERE tt."eventId" = e."id"
  AND e."slug" IN (
    'fally-ipupa-live-in-nairobi-2026',
    'roots-n-riddim-2026',
    'too-early-for-birds-wangari-maathai-rerun-2026',
    'peaches-and-cream-2026'
  )
  AND NOT EXISTS (SELECT 1 FROM "order_items" oi WHERE oi."ticketTypeId" = tt."id")
  AND NOT EXISTS (SELECT 1 FROM "tickets" t WHERE t."ticketTypeId" = tt."id");

WITH tier_data (
  id, event_slug, name, category, price, availability, description, sales_end
) AS (
  VALUES
    ('20000000-0000-4000-8000-000000000001', 'fally-ipupa-live-in-nairobi-2026', 'Regular Offer (Limited)', 'REGULAR', 6000, 'AVAILABLE', NULL, '2026-09-03 20:59:00'),
    ('20000000-0000-4000-8000-000000000002', 'fally-ipupa-live-in-nairobi-2026', 'Wave 1 Regular Ticket', 'REGULAR', 10000, 'CLOSED', NULL, '2026-08-31 20:59:00'),
    ('20000000-0000-4000-8000-000000000003', 'fally-ipupa-live-in-nairobi-2026', 'VIP Offer (Limited)', 'VIP', 16000, 'AVAILABLE', NULL, '2026-09-03 20:59:00'),
    ('20000000-0000-4000-8000-000000000004', 'fally-ipupa-live-in-nairobi-2026', 'Wave 1 VVIP Ticket', 'VVIP', 40000, 'AVAILABLE', NULL, '2026-09-04 20:59:00'),
    ('20000000-0000-4000-8000-000000000005', 'fally-ipupa-live-in-nairobi-2026', 'VVIP Couple Ticket', 'VVIP', 60000, 'AVAILABLE', 'Total price for a couple; not a per-person price.', '2026-09-05 12:00:00'),

    ('20000000-0000-4000-8000-000000000006', 'roots-n-riddim-2026', 'Phase 2 — General Admission', 'REGULAR', 4000, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000007', 'roots-n-riddim-2026', 'Phase 2 — VIP', 'VIP', 7500, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000008', 'roots-n-riddim-2026', 'Phase 2 — VVIP', 'VVIP', 12500, 'AVAILABLE', NULL, NULL),

    ('20000000-0000-4000-8000-000000000009', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mukima Ticket — Friday 7PM', 'REGULAR', 2800, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000010', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mugumo Ticket — Friday 7PM', 'VIP', 5000, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000011', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Forest of 4 Group Ticket — Friday 7PM', 'VVIP', 10000, 'AVAILABLE', 'Total price for a group of four; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000012', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mukima Ticket — Saturday 2PM', 'REGULAR', 2800, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000013', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mugumo Ticket — Saturday 2PM', 'VIP', 5000, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000014', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Forest of 4 Group Ticket — Saturday 2PM', 'VVIP', 10000, 'AVAILABLE', 'Total price for a group of four; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000015', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mukima Ticket — Saturday 7PM', 'REGULAR', 2800, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000016', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mugumo Ticket — Saturday 7PM', 'VIP', 5000, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000017', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Forest of 4 Group Ticket — Saturday 7PM', 'VVIP', 10000, 'AVAILABLE', 'Total price for a group of four; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000018', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mukima Ticket — Sunday 2PM', 'REGULAR', 2800, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000019', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mugumo Ticket — Sunday 2PM', 'VIP', 5000, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000020', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Forest of 4 Group Ticket — Sunday 2PM', 'VVIP', 10000, 'AVAILABLE', 'Total price for a group of four; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000021', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mukima Ticket — Sunday 7PM', 'REGULAR', 2800, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000022', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Mugumo Ticket — Sunday 7PM', 'VIP', 5000, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000023', 'too-early-for-birds-wangari-maathai-rerun-2026', 'Forest of 4 Group Ticket — Sunday 7PM', 'VVIP', 10000, 'AVAILABLE', 'Total price for a group of four; not a per-person price.', NULL),

    ('20000000-0000-4000-8000-000000000024', 'peaches-and-cream-2026', 'Early Bird — General Admission', 'EARLY_BIRD', 2000, 'SOLD_OUT', NULL, NULL),
    ('20000000-0000-4000-8000-000000000025', 'peaches-and-cream-2026', 'Phase One — General Admission', 'REGULAR', 2500, 'SOLD_OUT', NULL, NULL),
    ('20000000-0000-4000-8000-000000000026', 'peaches-and-cream-2026', 'Phase Two — General Admission', 'REGULAR', 3000, 'SOLD_OUT', NULL, NULL),
    ('20000000-0000-4000-8000-000000000027', 'peaches-and-cream-2026', 'Phase Three — General Admission', 'REGULAR', 3500, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000028', 'peaches-and-cream-2026', 'Final Phase — General Admission', 'REGULAR', 4000, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000029', 'peaches-and-cream-2026', 'Early Bird — VIP Experience', 'VIP', 4000, 'SOLD_OUT', NULL, NULL),
    ('20000000-0000-4000-8000-000000000030', 'peaches-and-cream-2026', 'Peach Pair — Group of Two', 'REGULAR', 5600, 'CLOSED', 'Total price for a group of two; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000031', 'peaches-and-cream-2026', 'VIP Experience — Advance', 'VIP', 6000, 'AVAILABLE', NULL, NULL),
    ('20000000-0000-4000-8000-000000000032', 'peaches-and-cream-2026', 'Four Good Times — Group of Four', 'VVIP', 11000, 'CLOSED', 'Total price for a group of four; not a per-person price.', NULL)
)
INSERT INTO "ticket_types" (
  "id", "eventId", "name", "category", "price", "quantity", "quantitySold",
  "availabilityStatus", "description", "salesStart", "salesEnd", "createdAt", "updatedAt"
)
SELECT
  td.id,
  e.id,
  td.name,
  td.category::"TicketTypeCategory",
  td.price::DECIMAL(10, 2),
  0,
  0,
  td.availability::"TicketAvailabilityStatus",
  td.description,
  NULL,
  td.sales_end::TIMESTAMP(3),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM tier_data td
JOIN "events" e ON e."slug" = td.event_slug
ON CONFLICT ("id") DO UPDATE SET
  "eventId" = EXCLUDED."eventId",
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "price" = EXCLUDED."price",
  "quantity" = 0,
  "quantitySold" = 0,
  "availabilityStatus" = EXCLUDED."availabilityStatus",
  "description" = EXCLUDED."description",
  "salesStart" = NULL,
  "salesEnd" = EXCLUDED."salesEnd",
  "updatedAt" = CURRENT_TIMESTAMP;
