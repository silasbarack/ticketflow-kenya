-- Sell the October 2026 calendar picks through TicketFlow Kenya.
--
-- These nine events were shown on the frontend as hard-coded EXTERNAL
-- listings whose "View official tickets" button sent buyers to TikoHUB,
-- Little, KULTURE and Tipsi Tickets. They had no database rows, so they could
-- not be ordered here at all. They now become real INTERNAL events owned by
-- the (already verified) listings desk, with stocked tiers, so every listed
-- poster is bought through TicketFlow checkout and paid by M-Pesa.
--
-- Times are stored in UTC (EAT - 3h), matching the rest of the catalogue.

-- 1. Categories the calendar picks are filed under. The seed creates the same
--    rows; ON CONFLICT keeps this safe on a seeded database.
INSERT INTO "event_categories" ("id", "name", "slug", "createdAt")
VALUES
  ('00000000-0000-4000-8000-000000000061', 'Music & Concerts', 'music-concerts', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000062', 'Tech & Business', 'tech-business', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000063', 'Sports', 'sports', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000064', 'Arts & Theatre', 'arts-theatre', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000065', 'Festivals', 'festivals', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 2. The events themselves.
WITH event_data (
  id, slug, title, subtitle, description, organizer_name, venue, city,
  address, category_slug, start_at, end_at, poster_url, poster_alt,
  verification_source, verification_url, secondary_url
) AS (
  VALUES
    (
      '10000000-0000-4000-8000-000000000005', 'miles-of-melody-where-rhythm-roams-2026',
      'Miles of Melody: Where Rhythm Roams', 'The Catalog 254 — music, conversation and community',
      'An intimate afternoon built around music, conversation and community, with the featured artist in the room to unpack the creative process track by track.',
      'The Catalog 254', 'Chronos', 'Nairobi', 'Lavington, Nairobi', 'music-concerts',
      '2026-09-26 12:00:00', '2026-09-26 18:00:00',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=88',
      'Live singer performing under warm stage lights',
      'TikoHUB', 'https://www.tikohub.com/events/miles-of-melody-where-rhythm-roams', NULL
    ),
    (
      '10000000-0000-4000-8000-000000000006', 'africa-concours-delegance-2026',
      'Africa Concours d’Elegance 2026', 'Vintage cars, classic motorcycles and Kenya motoring culture',
      'Kenya’s long-running classic motoring showcase returns to Ngong Racecourse with vintage and classic cars, motorcycles and a full day of automotive culture.',
      'Africa Concours d’Elegance', 'Ngong Racecourse', 'Nairobi', 'Ngong Road, Nairobi', 'festivals',
      '2026-09-27 06:00:00', '2026-09-27 15:00:00',
      'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=88',
      'Classic sports car displayed outdoors',
      'Little Events', 'https://apps.little.africa/events/55',
      'https://nairobieventsguide.com/event/2026-africa-concours-delegance/'
    ),
    (
      '10000000-0000-4000-8000-000000000007', 'first-rhumba-vip-affair-2026',
      'The First Rhumba VIP Affair', 'A premium live Rhumba night at Emara Ole-Sereni',
      'A premium Rhumba experience bringing together live bands, DJs, hospitality and an elegant evening atmosphere at Emara Ole-Sereni.',
      'Zeget Delongeur & E&F Sounds Entertainment', 'Emara Ole-Sereni', 'Nairobi', 'Mombasa Road, Nairobi', 'music-concerts',
      '2026-10-03 15:00:00', '2026-10-03 23:00:00',
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=88',
      'Musician performing live on stage',
      'TikoHUB', 'https://tikohub.com/events/the-first-rhumba-vip-affair', NULL
    ),
    (
      '10000000-0000-4000-8000-000000000008', 'safari-7s-2026',
      'Safari 7s 2026', 'Three days of rugby, entertainment and festival energy',
      'East Africa’s rugby festival returns to Nyayo Stadium for three days of sevens rugby, entertainment and a high-energy stadium atmosphere.',
      'Safari 7s', 'Nyayo Stadium', 'Nairobi', 'Nyayo National Stadium, Nairobi', 'sports',
      '2026-10-09 04:30:00', '2026-10-11 17:00:00',
      'https://images.unsplash.com/photo-1515808266237-4f89cbe46c1c?auto=format&fit=crop&w=1200&q=88',
      'Rugby players competing on a green field',
      'TikoHUB', 'https://tikohub.com/events/safari-7s-2026', NULL
    ),
    (
      '10000000-0000-4000-8000-000000000009', 'kulture-icons-soundtrack-2026',
      'KULTURE: Celebrating the Icons & The Soundtrack', 'A seated celebration of the music that shaped a generation',
      'An evening celebrating influential music and cultural icons, with red carpet arrivals followed by a gala show at the Tsavo Ballroom, KICC.',
      'KULTURE', 'Tsavo Ballroom, KICC', 'Nairobi', 'Kenyatta International Convention Centre, Nairobi', 'arts-theatre',
      '2026-10-10 13:00:00', '2026-10-10 21:00:00',
      'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=88',
      'Audience watching a theatrical stage performance',
      'KULTURE', 'https://kulture.ke/', NULL
    ),
    (
      '10000000-0000-4000-8000-000000000010', 'pineapple-party-nairobi-2026',
      'Pineapple Party', 'A Saturday music and nightlife experience in Westlands',
      'A Nairobi weekend party experience at Nairobi Street Kitchen, bringing together music, food and a lively social crowd.',
      'Pineapple Party', 'Nairobi Street Kitchen', 'Nairobi', 'Mpaka Road, Westlands, Nairobi', 'music-concerts',
      '2026-10-10 13:00:00', '2026-10-10 23:00:00',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=88',
      'Crowd enjoying a colourful outdoor music event',
      'Tipsi Tickets', 'https://www.tipsitickets.com/', NULL
    ),
    (
      '10000000-0000-4000-8000-000000000011', 'midnight-royale-2026',
      'Midnight Royale', 'A late-night Nairobi experience at Carnivore Grounds',
      'A Saturday-to-Sunday entertainment experience at The Carnivore Grounds, with tickets from KES 1,500.',
      'Midnight Royale', 'The Carnivore Grounds', 'Nairobi', 'Langata Road, Nairobi', 'festivals',
      '2026-10-17 12:00:00', '2026-10-18 00:00:00',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=88',
      'Large concert crowd under red stage lighting',
      'Tipsi Tickets', 'https://www.tipsitickets.com/', NULL
    ),
    (
      '10000000-0000-4000-8000-000000000012', 'teen-pop-up-festival-2026',
      '2nd Edition Teen Pop Up Festival', 'A daytime youth festival at Nairobi Arboretum',
      'A daytime festival at Nairobi Arboretum with affordable entry and a youth-focused mix of social, creative and entertainment experiences.',
      'Teen Pop Up Festival', 'The Nairobi Arboretum', 'Nairobi', 'State House Road, Nairobi', 'festivals',
      '2026-10-24 03:00:00', '2026-10-24 13:00:00',
      'https://images.unsplash.com/photo-1496024840928-4c417adf211d?auto=format&fit=crop&w=1200&q=88',
      'Outdoor festival crowd in daylight',
      'Tipsi Tickets', 'https://www.tipsitickets.com/', NULL
    ),
    (
      '10000000-0000-4000-8000-000000000013', 'ai-build-day-2nd-edition-2026',
      'AI Build Day — 2nd Edition', 'A technology build day at Strathmore University',
      'A hands-on technology event at Strathmore University for builders, developers and people interested in creating with AI.',
      'AI Build Day', 'Strathmore University', 'Nairobi', 'Madaraka Estate, Nairobi', 'tech-business',
      '2026-11-06 03:00:00', '2026-11-06 11:00:00',
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=88',
      'Developer working on code at a laptop',
      'Tipsi Tickets', 'https://www.tipsitickets.com/', NULL
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
  ed.id, op.id, ec.id, ed.title, ed.slug, ed.subtitle, ed.description,
  ed.poster_url, ed.poster_alt, NULL, ed.venue, ed.city, 'Nairobi', ed.address,
  ed.organizer_name, ed.start_at::TIMESTAMP(3), ed.end_at::TIMESTAMP(3),
  'Africa/Nairobi', 'PUBLISHED'::"EventStatus", true,
  'INTERNAL'::"EventBookingMode", NULL,
  ed.verification_source, ed.verification_url, ed.secondary_url,
  '2026-09-25 16:00:00'::TIMESTAMP(3), true, false,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
  "venue" = EXCLUDED."venue",
  "city" = EXCLUDED."city",
  "county" = EXCLUDED."county",
  "address" = EXCLUDED."address",
  "organizerName" = EXCLUDED."organizerName",
  "startDateTime" = EXCLUDED."startDateTime",
  "endDateTime" = EXCLUDED."endDateTime",
  "status" = EXCLUDED."status",
  "isFeatured" = EXCLUDED."isFeatured",
  "bookingMode" = EXCLUDED."bookingMode",
  "bookingUrl" = NULL,
  "verificationSource" = EXCLUDED."verificationSource",
  "verificationSourceUrl" = EXCLUDED."verificationSourceUrl",
  "secondaryVerificationSourceUrl" = EXCLUDED."secondaryVerificationSourceUrl",
  "verifiedAt" = EXCLUDED."verifiedAt",
  "salesEnabled" = true,
  "isDemo" = false,
  "updatedAt" = CURRENT_TIMESTAMP;

-- 3. One stocked tier per event, priced as the calendar listed it. On a
--    re-run the allocation never drops below what has already been sold.
WITH tier_data (id, event_slug, name, category, price, quantity) AS (
  VALUES
    ('20000000-0000-4000-8000-000000000033', 'miles-of-melody-where-rhythm-roams-2026', 'Entry ticket', 'REGULAR', 1000, 400),
    ('20000000-0000-4000-8000-000000000034', 'africa-concours-delegance-2026', 'Advance adult', 'REGULAR', 1800, 400),
    ('20000000-0000-4000-8000-000000000035', 'first-rhumba-vip-affair-2026', 'VIP ticket', 'VIP', 3000, 150),
    ('20000000-0000-4000-8000-000000000036', 'safari-7s-2026', 'Friday regular', 'REGULAR', 300, 400),
    ('20000000-0000-4000-8000-000000000037', 'kulture-icons-soundtrack-2026', 'Zone H', 'REGULAR', 2000, 400),
    ('20000000-0000-4000-8000-000000000038', 'pineapple-party-nairobi-2026', 'Entry', 'REGULAR', 1500, 400),
    ('20000000-0000-4000-8000-000000000039', 'midnight-royale-2026', 'Entry', 'REGULAR', 1500, 400),
    ('20000000-0000-4000-8000-000000000040', 'teen-pop-up-festival-2026', 'Entry', 'REGULAR', 250, 400),
    ('20000000-0000-4000-8000-000000000041', 'ai-build-day-2nd-edition-2026', 'Entry', 'REGULAR', 800, 400)
)
INSERT INTO "ticket_types" (
  "id", "eventId", "name", "category", "price", "quantity", "quantitySold",
  "availabilityStatus", "description", "salesStart", "salesEnd", "createdAt", "updatedAt"
)
SELECT
  td.id, e.id, td.name, td.category::"TicketTypeCategory",
  td.price::DECIMAL(10, 2), td.quantity, 0,
  'AVAILABLE'::"TicketAvailabilityStatus", NULL, NULL, NULL,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM tier_data td
JOIN "events" e ON e."slug" = td.event_slug
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "price" = EXCLUDED."price",
  "quantity" = GREATEST(EXCLUDED."quantity", "ticket_types"."quantitySold"),
  "availabilityStatus" = EXCLUDED."availabilityStatus",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 4. No listing may route a buyer to another seller any more.
UPDATE "events"
SET "bookingMode" = 'INTERNAL', "bookingUrl" = NULL, "updatedAt" = CURRENT_TIMESTAMP
WHERE "bookingMode" = 'EXTERNAL' OR "bookingUrl" IS NOT NULL;
