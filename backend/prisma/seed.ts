import { PrismaClient, UserRole, EventStatus, TicketTypeCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Demo customer accounts aren't referenced anywhere else in this script, so
// if one's seed phone number collides with a real account created by app
// testing (e.g. the seed email was changed via the profile page), skip it
// with a warning instead of failing the whole seed run.
async function upsertDemoUser(args: Parameters<typeof prisma.user.upsert>[0]) {
  try {
    return await prisma.user.upsert(args);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      console.warn(`Skipped demo user ${JSON.stringify(args.where)}: unique constraint already taken (${e.meta?.target}).`);
      return null;
    }
    throw e;
  }
}

async function main() {
  console.log('Seeding database...');

  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticketflow.co.ke' },
    update: {},
    create: {
      email: 'admin@ticketflow.co.ke',
      phone: '+254700000001',
      passwordHash: await hash('Admin@123'),
      firstName: 'Asha',
      lastName: 'Mwangi',
      role: UserRole.ADMIN,
    },
  });

  const organizerUser = await prisma.user.upsert({
    where: { email: 'organizer@ticketflow.co.ke' },
    update: {},
    create: {
      email: 'organizer@ticketflow.co.ke',
      phone: '+254700000002',
      passwordHash: await hash('Organizer@123'),
      firstName: 'Brian',
      lastName: 'Otieno',
      role: UserRole.ORGANIZER,
    },
  });

  await upsertDemoUser({
    where: { email: 'customer1@ticketflow.co.ke' },
    update: {},
    create: {
      email: 'customer1@ticketflow.co.ke',
      phone: '+254700000003',
      passwordHash: await hash('Customer@123'),
      firstName: 'Faith',
      lastName: 'Njeri',
      role: UserRole.CUSTOMER,
    },
  });

  await upsertDemoUser({
    where: { email: 'customer2@ticketflow.co.ke' },
    update: {},
    create: {
      email: 'customer2@ticketflow.co.ke',
      phone: '+254700000004',
      passwordHash: await hash('Customer@123'),
      firstName: 'Kevin',
      lastName: 'Kiptoo',
      role: UserRole.CUSTOMER,
    },
  });

  const organizerProfile = await prisma.organizerProfile.upsert({
    where: { userId: organizerUser.id },
    update: {},
    create: {
      userId: organizerUser.id,
      companyName: 'Nairobi Live Events',
      description: 'Premier event production company based in Nairobi.',
      phone: '+254700000002',
      isVerified: true,
    },
  });

  // Categories
  const categoryNames = ['Music & Concerts', 'Tech & Business', 'Sports', 'Arts & Theatre', 'Festivals'];
  const categories: Awaited<ReturnType<typeof prisma.eventCategory.upsert>>[] = [];
  for (const name of categoryNames) {
    const cat = await prisma.eventCategory.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
    categories.push(cat);
  }

  // ------------------------------------------------------------------
  // Listings desk: a TicketFlow-owned organizer record that carries events
  // which are listed for information only. It is deliberately UNVERIFIED, so
  // isEventBookable and OrdersService#create both refuse to sell for it —
  // TicketFlow is not the ticketing partner for these events and must never
  // take money on their behalf.
  // ------------------------------------------------------------------
  const listingsUser = await prisma.user.upsert({
    where: { email: 'listings@ticketflow.co.ke' },
    update: {},
    create: {
      email: 'listings@ticketflow.co.ke',
      phone: '+254700000005',
      passwordHash: await hash(randomBytes(24).toString('hex')),
      firstName: 'TicketFlow',
      lastName: 'Listings',
      role: UserRole.ORGANIZER,
      // Not a sign-in account — it exists only to own editorial listings.
      isActive: false,
    },
  });

  const listingsProfile = await prisma.organizerProfile.upsert({
    where: { userId: listingsUser.id },
    update: { isVerified: false },
    create: {
      userId: listingsUser.id,
      companyName: 'Organizer (not onboarded)',
      description:
        'Listed on TicketFlow Kenya for information only. Tickets for this event are sold by the ' +
        'organizer through their own channels — TicketFlow Kenya is not the ticketing partner and ' +
        'does not collect payment for it.',
      isVerified: false,
    },
  });

  // ------------------------------------------------------------------
  // Upcoming lineup — every event starts after 31 August 2026.
  //
  // source: 'demo' events are TicketFlow's own sample listings: invented
  // events under the platform's own verified demo organizer, with invented
  // price ladders. They are bookable so the full order -> M-Pesa -> QR ticket
  // flow can be exercised, and isDemo blocks them from ever taking money
  // against production Daraja credentials (see OrdersService#create).
  //
  // source: 'listing' events are REAL third-party events reproduced from the
  // organizer's own published information. Only verified facts are stored, no
  // price tier is invented, and sales are disabled.
  //
  // ------------------------------------------------------------------
  type SeedEvent = {
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    venue: string;
    city: string;
    county: string;
    categoryIndex: number;
    /** Local start date, YYYY-MM-DD. */
    date: string;
    startHour: number;
    startMinute?: number;
    /** Days after the start date on which the event ends (0 = same day). */
    durationDays: number;
    endHour: number;
    posterAlt: string;
    source: 'demo' | 'listing';
    ticketTiers: { name: string; category: TicketTypeCategory; price: number; quantity: number }[];
  };

  const eventSeeds: SeedEvent[] = [
    {
      slug: 'campus-vibe-fest-2026',
      title: 'Campus Vibe Fest 2026',
      subtitle: 'Inter-university music and culture day',
      description:
        'A full day of student energy at the Nakuru Athletic Club: campus bands and DJ battles across two stages, a poetry and freestyle tent, sports challenges, food courts, and a headline gengetone set to close the night. Open to students and the general public.',
      venue: 'Nakuru Athletic Club',
      city: 'Nakuru',
      county: 'Nakuru',
      categoryIndex: 4,
      date: '2026-09-12',
      startHour: 12,
      durationDays: 0,
      endHour: 22,
      posterAlt:
        'Poster for Campus Vibe Fest 2026, an inter-university music day at Nakuru Athletic Club, Nakuru, on 12 September 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Student', category: TicketTypeCategory.STUDENT, price: 500, quantity: 800 },
        { name: 'Regular', category: TicketTypeCategory.REGULAR, price: 900, quantity: 1200 },
        { name: 'VIP', category: TicketTypeCategory.VIP, price: 2000, quantity: 150 },
      ],
    },
    {
      slug: 'punchline-live-2026',
      title: 'Punchline Live: Comedy All-Stars',
      subtitle: 'Six comedians, one stage, one night',
      description:
        'Six of the sharpest stand-up comedians on the Kenyan circuit take the Kenya National Theatre stage for a single night of sets in English, Kiswahili and Sheng — plus a short improv segment where the audience writes the punchlines. Doors and bar open an hour before curtain.',
      venue: 'Kenya National Theatre',
      city: 'Nairobi',
      county: 'Nairobi',
      categoryIndex: 3,
      date: '2026-09-19',
      startHour: 19,
      durationDays: 0,
      endHour: 23,
      posterAlt:
        'Poster for Punchline Live: Comedy All-Stars, a stand-up comedy night at Kenya National Theatre, Nairobi, on 19 September 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Early Bird', category: TicketTypeCategory.EARLY_BIRD, price: 1000, quantity: 200 },
        { name: 'Regular', category: TicketTypeCategory.REGULAR, price: 1500, quantity: 400 },
        { name: 'VIP', category: TicketTypeCategory.VIP, price: 3000, quantity: 60 },
      ],
    },
    {
      slug: 'kisumu-lakeside-cultural-festival-2026',
      title: 'Kisumu Lakeside Cultural Festival',
      subtitle: 'Two days of lakeside heritage on Lake Victoria',
      description:
        'A weekend at Dunga Beach celebrating lakeside culture: ohangla and benga bands, traditional dance troupes from across Nyanza, a boat-builders and fishing heritage exhibition, tilapia grills and kuon stalls, and a sunset drum circle at the water’s edge.',
      venue: 'Dunga Beach',
      city: 'Kisumu',
      county: 'Kisumu',
      categoryIndex: 4,
      date: '2026-09-26',
      startHour: 10,
      durationDays: 1,
      endHour: 22,
      posterAlt:
        'Poster for the Kisumu Lakeside Cultural Festival at Dunga Beach, Kisumu, on 26 and 27 September 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Student', category: TicketTypeCategory.STUDENT, price: 400, quantity: 300 },
        { name: 'Early Bird', category: TicketTypeCategory.EARLY_BIRD, price: 700, quantity: 400 },
        { name: 'Regular', category: TicketTypeCategory.REGULAR, price: 1000, quantity: 900 },
        { name: 'VIP Deck', category: TicketTypeCategory.VIP, price: 2500, quantity: 120 },
      ],
    },
    {
      slug: 'rhumba-and-riddim-nairobi-live-2026',
      title: 'Rhumba & Riddim: Nairobi Live',
      subtitle: 'One stage, from classic rhumba to Afrobeats',
      description:
        'A full-scale open-air concert at Uhuru Gardens tracing Kenyan and Congolese sound across one night — a live rhumba orchestra, a benga revival set, and an Afrobeats headliner to close, with a festival light rig, food trucks, and DJ sets until midnight.',
      venue: 'Uhuru Gardens',
      city: 'Nairobi',
      county: 'Nairobi',
      categoryIndex: 0,
      date: '2026-10-03',
      startHour: 18,
      durationDays: 0,
      endHour: 23,
      posterAlt:
        'Poster for Rhumba & Riddim: Nairobi Live, an open-air concert at Uhuru Gardens, Nairobi, on 3 October 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Student', category: TicketTypeCategory.STUDENT, price: 1200, quantity: 400 },
        { name: 'Early Bird', category: TicketTypeCategory.EARLY_BIRD, price: 1800, quantity: 700 },
        { name: 'Regular', category: TicketTypeCategory.REGULAR, price: 2500, quantity: 3000 },
        { name: 'VIP', category: TicketTypeCategory.VIP, price: 6000, quantity: 400 },
        { name: 'VVIP', category: TicketTypeCategory.VVIP, price: 12000, quantity: 100 },
      ],
    },
    {
      // Modelled on a REAL event, with every fact verified against the
      // organizer's own site (kulture.ke) on 31 Aug 2026: date, venue, running
      // order, and the advertised entry price ("Limited Seating per Zone, from
      // Kshs 2,000").
      //
      // The organizer publishes no public tier breakdown, so none is invented:
      // the single stored price is their own advertised entry figure and
      // nothing else. It seeds as a sample listing like the rest of this
      // lineup, which keeps it bookable against the sandbox/mock payment path
      // while the isDemo guard in OrdersService#create makes it impossible to
      // charge anyone real money for it.
      slug: 'kulture-iii-2026',
      title: 'KulturE III',
      subtitle: 'Celebrating the icons and the soundtrack that shaped a generation',
      description:
        'KulturE III is a gala evening at the Tsavo Ballroom, KICC, honouring the artists and records that shaped a generation of Kenyan music. Red carpet and cocktails from 4pm, with the gala show running 8pm to midnight. Seating is limited per zone, from Kshs 2,000.\n\nEvent details are reproduced from the organizer’s own listing at kulture.ke. This is a sample listing on a development build of TicketFlow Kenya — the organizer sells the real tickets themselves.',
      venue: 'Tsavo Ballroom, KICC',
      city: 'Nairobi',
      county: 'Nairobi',
      categoryIndex: 0,
      date: '2026-10-10',
      startHour: 16,
      durationDays: 1,
      endHour: 0,
      posterAlt:
        'Poster for KulturE III, a gala evening at the Tsavo Ballroom, KICC, Nairobi, on 10 October 2026',
      source: 'demo',
      ticketTiers: [
        // The organizer's own advertised entry price — not a TicketFlow ladder.
        { name: 'Zone entry from', category: TicketTypeCategory.REGULAR, price: 2000, quantity: 400 },
      ],
    },
    {
      slug: 'mombasa-spice-and-seafood-festival-2026',
      title: 'Mombasa Spice & Seafood Festival',
      subtitle: 'Swahili coast cooking at Mama Ngina Waterfront',
      description:
        'Two days of coastal cooking at Mama Ngina Waterfront Park: crab and prawn grills, biryani and pilau cooked in the open, a spice market from Old Town traders, dhow trips at high tide, and taarab and bango bands playing through both sunsets.',
      venue: 'Mama Ngina Waterfront Park',
      city: 'Mombasa',
      county: 'Mombasa',
      categoryIndex: 4,
      date: '2026-10-24',
      startHour: 11,
      durationDays: 1,
      endHour: 22,
      posterAlt:
        'Poster for the Mombasa Spice & Seafood Festival at Mama Ngina Waterfront Park, Mombasa, on 24 and 25 October 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Early Bird', category: TicketTypeCategory.EARLY_BIRD, price: 800, quantity: 500 },
        { name: 'Regular', category: TicketTypeCategory.REGULAR, price: 1200, quantity: 1500 },
        { name: 'VIP Tasting', category: TicketTypeCategory.VIP, price: 3000, quantity: 200 },
        { name: 'VVIP Dhow Deck', category: TicketTypeCategory.VVIP, price: 6000, quantity: 40 },
      ],
    },
    {
      slug: 'nairobi-digital-economy-summit-2026',
      title: 'Nairobi Digital Economy Summit 2026',
      subtitle: 'Two days on payments, AI and getting the next million businesses online',
      description:
        'A two-day working summit at Sarit Expo Centre for people building Kenya’s digital economy: mobile money and open banking APIs, AI in credit and customer service, cross-border payments, and the regulation shaping all three — plus a startup pitch arena, a hiring hall, and investor office hours.',
      venue: 'Sarit Expo Centre',
      city: 'Nairobi',
      county: 'Nairobi',
      categoryIndex: 1,
      date: '2026-11-05',
      startHour: 8,
      startMinute: 30,
      durationDays: 1,
      endHour: 17,
      posterAlt:
        'Poster for the Nairobi Digital Economy Summit 2026 at Sarit Expo Centre, Nairobi, on 5 and 6 November 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Student', category: TicketTypeCategory.STUDENT, price: 1500, quantity: 120 },
        { name: 'Standard', category: TicketTypeCategory.REGULAR, price: 6000, quantity: 600 },
        { name: 'Professional', category: TicketTypeCategory.VIP, price: 9500, quantity: 250 },
        { name: 'Executive', category: TicketTypeCategory.VVIP, price: 18000, quantity: 60 },
      ],
    },
    {
      slug: 'naivasha-sundowner-music-festival-2026',
      title: 'Naivasha Sundowner Music Festival',
      subtitle: 'Two days of live music on the lake',
      description:
        'A lakeside weekend at Lake Naivasha Resort: afro-house and amapiano on the sunset stage, an acoustic and folk stage under the acacias, camping and glamping on site, boat rides at dawn, and DJ sets running to 2am both nights.',
      venue: 'Lake Naivasha Resort',
      city: 'Naivasha',
      county: 'Nakuru',
      categoryIndex: 0,
      date: '2026-11-14',
      startHour: 14,
      durationDays: 1,
      endHour: 23,
      posterAlt:
        'Poster for the Naivasha Sundowner Music Festival at Lake Naivasha Resort, Naivasha, on 14 and 15 November 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Early Bird', category: TicketTypeCategory.EARLY_BIRD, price: 2000, quantity: 600 },
        { name: 'Regular', category: TicketTypeCategory.REGULAR, price: 3000, quantity: 1800 },
        { name: 'VIP Lakeside', category: TicketTypeCategory.VIP, price: 7000, quantity: 250 },
        { name: 'VVIP Lodge', category: TicketTypeCategory.VVIP, price: 14000, quantity: 50 },
      ],
    },
    {
      slug: 'uhuru-run-nairobi-half-marathon-2026',
      title: 'Uhuru Run: Nairobi Charity Half Marathon',
      subtitle: 'Half marathon, 10K and a family fun run',
      description:
        'A morning road race starting and finishing at Nyayo National Stadium, with a half-marathon route through the city, a 10K, and a 5K family fun run. Chip timing, water stations every 3km, a finisher medal for every distance, and proceeds going to school sports equipment.',
      venue: 'Nyayo National Stadium',
      city: 'Nairobi',
      county: 'Nairobi',
      categoryIndex: 2,
      date: '2026-11-21',
      startHour: 6,
      startMinute: 30,
      durationDays: 0,
      endHour: 12,
      posterAlt:
        'Poster for the Uhuru Run charity half marathon starting at Nyayo National Stadium, Nairobi, on 21 November 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Student 5K', category: TicketTypeCategory.STUDENT, price: 700, quantity: 500 },
        { name: '10K Run', category: TicketTypeCategory.EARLY_BIRD, price: 1500, quantity: 1500 },
        { name: 'Half Marathon', category: TicketTypeCategory.REGULAR, price: 2500, quantity: 2000 },
        { name: 'VIP Runner Pack', category: TicketTypeCategory.VIP, price: 5000, quantity: 150 },
      ],
    },
    {
      slug: 'jamhuri-family-carnival-2026',
      title: 'Jamhuri Family Carnival',
      subtitle: 'A Jamhuri Day out for the whole family',
      description:
        'A Jamhuri Day carnival at Ngong Racecourse built for families: funfair rides and bouncing castles, a children’s story and puppet tent, a schools marching band parade, pony rides, a food court with kids’ menus, and an early evening fireworks finale.',
      venue: 'Ngong Racecourse',
      city: 'Nairobi',
      county: 'Nairobi',
      categoryIndex: 4,
      date: '2026-12-12',
      startHour: 9,
      durationDays: 0,
      endHour: 19,
      posterAlt:
        'Poster for the Jamhuri Family Carnival at Ngong Racecourse, Nairobi, on 12 December 2026',
      source: 'demo',
      ticketTiers: [
        { name: 'Child (under 12)', category: TicketTypeCategory.STUDENT, price: 500, quantity: 1000 },
        { name: 'Regular', category: TicketTypeCategory.REGULAR, price: 1200, quantity: 2000 },
        { name: 'VIP Family Lounge', category: TicketTypeCategory.VIP, price: 3500, quantity: 120 },
      ],
    },
  ];

  // Art direction for the posters lives in prisma/poster-art.json, which
  // frontend/scripts/generate-event-posters.py renders. It is intentionally not
  // a database column — prompts are development data and never reach a visitor.
  // Flag drift here so an event cannot quietly ship with no poster brief.
  const posterArt = JSON.parse(
    readFileSync(join(__dirname, 'poster-art.json'), 'utf8'),
  ) as { events: Record<string, string> };
  const missingArt = eventSeeds.filter((e) => !posterArt.events[e.slug]).map((e) => e.slug);
  if (missingArt.length > 0) {
    console.warn(`No poster art direction for: ${missingArt.join(', ')} (add it to prisma/poster-art.json)`);
  }

  for (const seedEvent of eventSeeds) {
    const [year, month, day] = seedEvent.date.split('-').map(Number);
    const start = new Date(year, month - 1, day, seedEvent.startHour, seedEvent.startMinute ?? 0, 0, 0);
    const end = new Date(year, month - 1, day + seedEvent.durationDays, seedEvent.endHour, 0, 0, 0);

    const isListing = seedEvent.source === 'listing';
    const eventData = {
      organizerId: isListing ? listingsProfile.id : organizerProfile.id,
      categoryId: categories[seedEvent.categoryIndex].id,
      title: seedEvent.title,
      subtitle: seedEvent.subtitle,
      description: seedEvent.description,
      posterUrl: `/events/posters/${seedEvent.slug}.webp`,
      posterAlt: seedEvent.posterAlt,
      venue: seedEvent.venue,
      city: seedEvent.city,
      county: seedEvent.county,
      address: `${seedEvent.venue}, ${seedEvent.city}`,
      startDateTime: start,
      endDateTime: end,
      status: EventStatus.PUBLISHED,
      isFeatured: true,
      // Information-only listings are visible but can never take money.
      salesEnabled: !isListing,
      isDemo: !isListing,
    };

    const event = await prisma.event.upsert({
      where: { slug: seedEvent.slug },
      update: eventData,
      create: { ...eventData, slug: seedEvent.slug },
    });

    // Tiers are matched by name (not by category), so an event may carry any
    // number of them — three for a comedy night, five for a stadium concert —
    // and two tiers may share a category if that is what the ladder needs.
    for (const tt of seedEvent.ticketTiers) {
      const existing = await prisma.ticketType.findFirst({
        where: { eventId: event.id, name: tt.name },
      });
      if (existing) {
        await prisma.ticketType.update({
          where: { id: existing.id },
          data: {
            category: tt.category,
            price: tt.price,
            quantity: Math.max(tt.quantity, existing.quantitySold),
          },
        });
      } else {
        await prisma.ticketType.create({
          data: {
            eventId: event.id,
            name: tt.name,
            category: tt.category,
            price: tt.price,
            quantity: tt.quantity,
          },
        });
      }
    }

    // Drop tiers no longer in this event's ladder — but only when nothing has
    // been sold, since sold ticket types are referenced by orders and tickets.
    const seededNames = seedEvent.ticketTiers.map((tt) => tt.name);
    const staleTiers = await prisma.ticketType.findMany({
      where: { eventId: event.id, name: { notIn: seededNames } },
    });
    for (const staleTier of staleTiers) {
      if (staleTier.quantitySold === 0) {
        await prisma.ticketType.delete({ where: { id: staleTier.id } });
        console.log(`Removed stale tier "${staleTier.name}" from ${event.title}`);
      } else {
        console.warn(`Kept stale tier "${staleTier.name}" on ${event.title} (${staleTier.quantitySold} sold)`);
      }
    }
  }

  // ------------------------------------------------------------------
  // Archive everything that is not in the lineup above.
  //
  // Never a delete: Order rows reference events with onDelete: Restrict, and a
  // customer who bought a ticket must keep being able to open it. A status
  // change is enough — only PUBLISHED events appear in the public catalogue.
  //
  // Past events become COMPLETED (they did happen); anything still in the
  // future that has been dropped from the lineup becomes CANCELLED.
  // ------------------------------------------------------------------
  const currentSlugs = eventSeeds.map((e) => e.slug);
  const now = new Date();
  const stale = await prisma.event.findMany({
    where: { status: EventStatus.PUBLISHED, slug: { notIn: currentSlugs } },
  });
  for (const event of stale) {
    const status = event.endDateTime < now ? EventStatus.COMPLETED : EventStatus.CANCELLED;
    await prisma.event.update({
      where: { id: event.id },
      // Also stop sales outright, so nothing can be bought for an archived
      // event even if its status is changed back by hand later.
      data: { status, salesEnabled: false },
    });
    console.log(`Archived "${event.title}" as ${status}`);
  }

  console.log('Seed complete.');
  console.log('--- Login credentials ---');
  console.log('Admin:     admin@ticketflow.co.ke / Admin@123');
  console.log('Organizer: organizer@ticketflow.co.ke / Organizer@123');
  console.log('Customer1: customer1@ticketflow.co.ke / Customer@123');
  console.log('Customer2: customer2@ticketflow.co.ke / Customer@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
