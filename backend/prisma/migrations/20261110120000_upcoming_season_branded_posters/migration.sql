-- Upcoming season (November 2026 – February 2027) for TicketFlow Kenya.
--
-- Eight TicketFlow-presented sample listings at real venues, each with a
-- TicketFlow-branded poster (company logo + "Good Events. Brighter People.")
-- served from frontend/public/events/posters/ and rendered by
-- frontend/scripts/event-posters/generate.js.
--
-- They are marked isDemo: the whole purchase flow works against the Daraja
-- sandbox and the mock endpoint, but OrdersService refuses them when
-- MPESA_ENV=production, so no real customer can pay for an invented event.
-- Clear isDemo on a listing only once it is a confirmed, real event.
--
-- Times are stored in UTC (EAT - 3h), matching the rest of the catalogue.
-- Mirrors backend/prisma/seed.ts, so seeded and migrated databases agree.

WITH event_data (
  id, slug, title, subtitle, description, venue, city, county, address,
  category_slug, start_at, end_at, poster_url, poster_alt
) AS (
  VALUES
    ('10000000-0000-4000-8000-000000000020', 'afro-house-sunset-sessions-2026',
     'Afro-House Sunset Sessions', 'Eight hours of Afro-house, amapiano and deep grooves on the lawn',
     'An open-air sundowner on the Ngong Racecourse lawn with a rotating line-up of Nairobi Afro-house and amapiano DJs from golden hour into the night. Food trucks, a craft-drinks bar and a covered VIP deck. Strictly 18+.',
     'Ngong Racecourse', 'Nairobi', 'Nairobi', 'Ngong Road, Nairobi', 'music-concerts',
     '2026-11-21 12:00:00', '2026-11-21 20:00:00',
     '/events/posters/afro-house-sunset-sessions-2026.jpg',
     'Afro-House Sunset Sessions poster with a setting sun, the TicketFlow Kenya logo and the motto Good Events. Brighter People.'),
    ('10000000-0000-4000-8000-000000000021', 'nairobi-startup-innovation-summit-2026',
     'Nairobi Startup & Innovation Summit', 'Founders, investors and builders shaping East Africa''s next decade',
     'A one-day summit at KICC with keynotes, founder panels, an investor pitch stage and an expo floor for East African startups. Includes lunch and networking sessions throughout the day.',
     'KICC', 'Nairobi', 'Nairobi', 'Kenyatta International Convention Centre, Harambee Avenue, Nairobi', 'tech-business',
     '2026-11-26 05:00:00', '2026-11-26 14:30:00',
     '/events/posters/nairobi-startup-innovation-summit-2026.jpg',
     'Nairobi Startup & Innovation Summit poster with a blue network pattern, the TicketFlow Kenya logo and the motto Good Events. Brighter People.'),
    ('10000000-0000-4000-8000-000000000022', 'swahili-coast-jazz-night-2026',
     'Swahili Coast Jazz Night', 'Live jazz, taarab and Afro-soul under the stars of Old Town',
     'An evening of live jazz, taarab and Afro-soul in the historic courtyard of Fort Jesus, with coastal cuisine from local kitchens. Seating is unreserved for regular tickets; VIP tickets include a reserved table seat.',
     'Fort Jesus', 'Mombasa', 'Mombasa', 'Nkrumah Road, Old Town, Mombasa', 'music-concerts',
     '2026-12-05 15:00:00', '2026-12-05 20:30:00',
     '/events/posters/swahili-coast-jazz-night-2026.jpg',
     'Swahili Coast Jazz Night poster with a gold vinyl record, the TicketFlow Kenya logo and the motto Good Events. Brighter People.'),
    ('10000000-0000-4000-8000-000000000023', 'jamhuri-day-family-fun-fair-2026',
     'Jamhuri Day Family Fun Fair', 'Rides, games, food stalls and live performances for the whole family',
     'Celebrate Jamhuri Day at Uhuru Gardens with fairground rides, a kids'' zone, face painting, food stalls and live performances from Kenyan artists and school choirs. Children under 3 enter free.',
     'Uhuru Gardens', 'Nairobi', 'Nairobi', 'Lang''ata Road, Nairobi', 'festivals',
     '2026-12-12 07:00:00', '2026-12-12 15:00:00',
     '/events/posters/jamhuri-day-family-fun-fair-2026.jpg',
     'Jamhuri Day Family Fun Fair poster in the Kenyan flag colours with the TicketFlow Kenya logo and the motto Good Events. Brighter People.'),
    ('10000000-0000-4000-8000-000000000024', 'a-nairobi-christmas-carol-2026',
     'A Nairobi Christmas Carol', 'The classic holiday tale, retold on the streets of the city in the sun',
     'A fresh stage adaptation of the classic Christmas story, set in present-day Nairobi, with live music and a cast of Kenyan actors. Suitable for ages 8 and up. Running time about 2 hours 30 minutes including an interval.',
     'Kenya National Theatre', 'Nairobi', 'Nairobi', 'Harry Thuku Road, Nairobi', 'arts-theatre',
     '2026-12-18 16:00:00', '2026-12-18 18:30:00',
     '/events/posters/a-nairobi-christmas-carol-2026.jpg',
     'A Nairobi Christmas Carol poster with gold stars and festive lights, the TicketFlow Kenya logo and the motto Good Events. Brighter People.'),
    ('10000000-0000-4000-8000-000000000025', 'countdown-2027-new-years-eve-festival',
     'Countdown 2027', 'New Year''s Eve festival — live acts, DJs and a midnight fireworks show',
     'See in 2027 at The Carnivore Grounds with live performances, two DJ stages, food courts and a midnight fireworks show. Gates open at 6 PM. Strictly 18+.',
     'The Carnivore Grounds', 'Nairobi', 'Nairobi', 'Lang''ata Road, Nairobi', 'festivals',
     '2026-12-31 15:00:00', '2027-01-01 00:00:00',
     '/events/posters/countdown-2027-new-years-eve-festival.jpg',
     'Countdown 2027 poster with fireworks over a purple night sky, the TicketFlow Kenya logo and the motto Good Events. Brighter People.'),
    ('10000000-0000-4000-8000-000000000026', 'nakuru-lakeside-10k-fun-run-2027',
     'Nakuru Lakeside 10K & Fun Run', 'Timed 10K race and a 5K fun run for every pace',
     'A chip-timed 10K road race and an untimed 5K fun run starting and finishing at Nakuru Athletic Club. Every entry includes a race T-shirt, finisher''s medal and post-race refreshments. Bib collection opens at 5:30 AM on race day.',
     'Nakuru Athletic Club', 'Nakuru', 'Nakuru', 'Nakuru Athletic Club, Nakuru', 'sports',
     '2027-01-17 03:30:00', '2027-01-17 09:00:00',
     '/events/posters/nakuru-lakeside-10k-fun-run-2027.jpg',
     'Nakuru Lakeside 10K & Fun Run poster with green running-track lines, the TicketFlow Kenya logo and the motto Good Events. Brighter People.'),
    ('10000000-0000-4000-8000-000000000027', 'love-and-laughter-valentines-comedy-night-2027',
     'Love & Laughter', 'A Valentine''s comedy night with Nairobi''s sharpest stand-up acts',
     'Spend the eve of Valentine''s Day laughing with a line-up of Nairobi stand-up comedians, hosted at the Alliance Française auditorium. Adult humour, 16+.',
     'Alliance Française de Nairobi', 'Nairobi', 'Nairobi', 'Loita Street, Nairobi', 'arts-theatre',
     '2027-02-13 16:30:00', '2027-02-13 19:30:00',
     '/events/posters/love-and-laughter-valentines-comedy-night-2027.jpg',
     'Love & Laughter Valentine''s comedy night poster with hearts under a spotlight, the TicketFlow Kenya logo and the motto Good Events. Brighter People.')
)
INSERT INTO "events" (
  "id", "organizerId", "categoryId", "title", "slug", "subtitle",
  "description", "posterUrl", "posterAlt", "posterSourceUrl", "venue", "city",
  "county", "address", "organizerName", "startDateTime", "endDateTime",
  "timezone", "status", "isFeatured", "bookingMode", "bookingUrl",
  "salesEnabled", "isDemo", "createdAt", "updatedAt"
)
SELECT
  ed.id, op.id, ec.id, ed.title, ed.slug, ed.subtitle, ed.description,
  ed.poster_url, ed.poster_alt, NULL, ed.venue, ed.city, ed.county, ed.address,
  'TicketFlow Kenya', ed.start_at::TIMESTAMP(3), ed.end_at::TIMESTAMP(3),
  'Africa/Nairobi', 'PUBLISHED'::"EventStatus", true,
  'INTERNAL'::"EventBookingMode", NULL, true, true,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM event_data ed
JOIN "event_categories" ec ON ec."slug" = ed.category_slug
JOIN "users" u ON u."email" = 'listings@ticketflow.co.ke'
JOIN "organizer_profiles" op ON op."userId" = u."id"
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "subtitle" = EXCLUDED."subtitle",
  "description" = EXCLUDED."description",
  "posterUrl" = EXCLUDED."posterUrl",
  "posterAlt" = EXCLUDED."posterAlt",
  "venue" = EXCLUDED."venue",
  "city" = EXCLUDED."city",
  "county" = EXCLUDED."county",
  "address" = EXCLUDED."address",
  "startDateTime" = EXCLUDED."startDateTime",
  "endDateTime" = EXCLUDED."endDateTime",
  "status" = EXCLUDED."status",
  "isFeatured" = EXCLUDED."isFeatured",
  "bookingMode" = EXCLUDED."bookingMode",
  "bookingUrl" = NULL,
  "salesEnabled" = true,
  "isDemo" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

-- Stocked tiers. On a re-run the allocation never drops below what has
-- already been sold.
WITH tier_data (id, event_slug, name, category, price, quantity, description, sales_end) AS (
  VALUES
    ('20000000-0000-4000-8000-000000000100', 'afro-house-sunset-sessions-2026', 'Early bird', 'EARLY_BIRD', 1500, 150, NULL, '2026-11-14 20:59:00'),
    ('20000000-0000-4000-8000-000000000101', 'afro-house-sunset-sessions-2026', 'General admission', 'REGULAR', 2500, 400, NULL, NULL),
    ('20000000-0000-4000-8000-000000000102', 'afro-house-sunset-sessions-2026', 'VIP deck', 'VIP', 6000, 150, 'Covered deck, dedicated bar and fast-lane entry.', NULL),
    ('20000000-0000-4000-8000-000000000103', 'nairobi-startup-innovation-summit-2026', 'Student', 'STUDENT', 1000, 200, 'Valid student ID required at check-in.', NULL),
    ('20000000-0000-4000-8000-000000000104', 'nairobi-startup-innovation-summit-2026', 'Delegate', 'REGULAR', 4500, 400, 'Full-day access with lunch.', NULL),
    ('20000000-0000-4000-8000-000000000105', 'nairobi-startup-innovation-summit-2026', 'VIP delegate', 'VIP', 9500, 150, 'Front-row seating, speaker lounge and evening reception.', NULL),
    ('20000000-0000-4000-8000-000000000106', 'swahili-coast-jazz-night-2026', 'Regular', 'REGULAR', 2000, 400, NULL, NULL),
    ('20000000-0000-4000-8000-000000000107', 'swahili-coast-jazz-night-2026', 'VIP table seat', 'VIP', 5000, 150, 'Reserved table seat near the stage.', NULL),
    ('20000000-0000-4000-8000-000000000108', 'jamhuri-day-family-fun-fair-2026', 'Child (3–12)', 'REGULAR', 500, 400, 'For children aged 3 to 12; under-3s enter free.', NULL),
    ('20000000-0000-4000-8000-000000000109', 'jamhuri-day-family-fun-fair-2026', 'Adult', 'REGULAR', 1000, 400, NULL, NULL),
    ('20000000-0000-4000-8000-000000000110', 'jamhuri-day-family-fun-fair-2026', 'Family of 4', 'REGULAR', 3200, 400, 'Total price for 2 adults and 2 children; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000111', 'a-nairobi-christmas-carol-2026', 'Student', 'STUDENT', 800, 200, 'Valid student ID required at check-in.', NULL),
    ('20000000-0000-4000-8000-000000000112', 'a-nairobi-christmas-carol-2026', 'Regular', 'REGULAR', 1500, 400, NULL, NULL),
    ('20000000-0000-4000-8000-000000000113', 'a-nairobi-christmas-carol-2026', 'Premium front rows', 'VIP', 3000, 150, NULL, NULL),
    ('20000000-0000-4000-8000-000000000114', 'countdown-2027-new-years-eve-festival', 'Early bird', 'EARLY_BIRD', 2000, 150, NULL, '2026-12-15 20:59:00'),
    ('20000000-0000-4000-8000-000000000115', 'countdown-2027-new-years-eve-festival', 'Regular', 'REGULAR', 3000, 400, NULL, NULL),
    ('20000000-0000-4000-8000-000000000116', 'countdown-2027-new-years-eve-festival', 'VIP', 'VIP', 7500, 150, 'VIP enclosure with dedicated bar and washrooms.', NULL),
    ('20000000-0000-4000-8000-000000000117', 'countdown-2027-new-years-eve-festival', 'VVIP lounge', 'VVIP', 15000, 60, 'Lounge seating, complimentary drinks and best fireworks view.', NULL),
    ('20000000-0000-4000-8000-000000000118', 'nakuru-lakeside-10k-fun-run-2027', 'Student 5K', 'STUDENT', 600, 200, 'Valid student ID required at bib collection.', NULL),
    ('20000000-0000-4000-8000-000000000119', 'nakuru-lakeside-10k-fun-run-2027', '5K fun run', 'REGULAR', 1000, 400, NULL, NULL),
    ('20000000-0000-4000-8000-000000000120', 'nakuru-lakeside-10k-fun-run-2027', '10K timed race', 'REGULAR', 1500, 400, 'Chip-timed, with results published after the race.', NULL),
    ('20000000-0000-4000-8000-000000000121', 'love-and-laughter-valentines-comedy-night-2027', 'Single', 'REGULAR', 2000, 400, NULL, NULL),
    ('20000000-0000-4000-8000-000000000122', 'love-and-laughter-valentines-comedy-night-2027', 'Couple', 'REGULAR', 3500, 400, 'Total price for 2 people; not a per-person price.', NULL),
    ('20000000-0000-4000-8000-000000000123', 'love-and-laughter-valentines-comedy-night-2027', 'VIP couple', 'VIP', 6000, 150, 'Total for 2 people: front tables and a welcome drink each.', NULL)
)
INSERT INTO "ticket_types" (
  "id", "eventId", "name", "category", "price", "quantity", "quantitySold",
  "availabilityStatus", "description", "salesStart", "salesEnd", "createdAt", "updatedAt"
)
SELECT
  td.id, e.id, td.name, td.category::"TicketTypeCategory",
  td.price::DECIMAL(10, 2), td.quantity, 0,
  'AVAILABLE'::"TicketAvailabilityStatus", td.description, NULL,
  td.sales_end::TIMESTAMP(3), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM tier_data td
JOIN "events" e ON e."slug" = td.event_slug
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "price" = EXCLUDED."price",
  "quantity" = GREATEST(EXCLUDED."quantity", "ticket_types"."quantitySold"),
  "availabilityStatus" = EXCLUDED."availabilityStatus",
  "description" = EXCLUDED."description",
  "salesEnd" = EXCLUDED."salesEnd",
  "updatedAt" = CURRENT_TIMESTAMP;
