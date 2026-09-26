import {
  EventBookingMode,
  EventStatus,
  PrismaClient,
  TicketAvailabilityStatus,
  TicketTypeCategory,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

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

async function upsertDemoUser(args: Parameters<typeof prisma.user.upsert>[0]) {
  try {
    return await prisma.user.upsert(args);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      console.warn(`Skipped demo user ${JSON.stringify(args.where)}: unique constraint already taken (${error.meta?.target}).`);
      return null;
    }
    throw error;
  }
}

type SeedTier = {
  name: string;
  category: TicketTypeCategory;
  price: number;
  availabilityStatus: TicketAvailabilityStatus;
  description?: string;
  salesEnd?: string;
};

type SeedEvent = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  organizerName: string;
  venue: string;
  city: string;
  county: string;
  address: string;
  categoryIndex: number;
  startAt: string;
  endAt: string;
  posterUrl: string;
  posterAlt: string;
  posterSourceUrl?: string;
  verificationSource: string;
  verificationSourceUrl: string;
  secondaryVerificationSourceUrl?: string;
  ticketTiers: SeedTier[];
};

const VERIFIED_AT = new Date('2026-09-01T00:00:00+03:00');

const LISTINGS_COMPANY = 'TicketFlow Kenya';
const LISTINGS_DESCRIPTION = 'Events ticketed and sold directly by TicketFlow Kenya.';

/**
 * Stock released per tier when TicketFlow holds the inventory. Mirrors the
 * allocation in migration 20260901190000_sell_catalogue_through_ticketflow so
 * a seeded database and a migrated one agree.
 */
const DEFAULT_TIER_ALLOCATION = 200;
const TIER_ALLOCATION: Partial<Record<TicketTypeCategory, number>> = {
  [TicketTypeCategory.EARLY_BIRD]: 150,
  [TicketTypeCategory.REGULAR]: 400,
  [TicketTypeCategory.STUDENT]: 200,
  [TicketTypeCategory.VIP]: 150,
  [TicketTypeCategory.VVIP]: 60,
};

// Real Nairobi events, verified against their public listings (Africa/Nairobi).
// Every one is ticketed and sold on TicketFlow Kenya itself: Book Now always
// leads to TicketFlow checkout, never to another seller.
const eventSeeds: SeedEvent[] = [
  {
    slug: 'fally-ipupa-live-in-nairobi-2026',
    title: 'Fally Ipupa Live in Nairobi',
    subtitle: 'Fally Ipupa and supporting acts live at Uhuru Gardens',
    description:
      'Fally Ipupa performs at Uhuru Gardens with a supporting lineup including Kamo Mphela, Tango Supreme, DJ Maphorisa, DJ Ice, Joe Mfalme and Kodong Klan. The official schedule runs from Saturday afternoon into early Sunday morning.',
    organizerName: 'Ticket Yetu — Radio Africa',
    venue: 'Uhuru Gardens',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Uhuru Gardens, Langata, Nairobi',
    categoryIndex: 0,
    startAt: '2026-09-05T15:00:00+03:00',
    endAt: '2026-09-06T03:00:00+03:00',
    posterUrl: 'https://admin.ticketsasa.com/storage/events/August2026/79OurX3VJB-1785932580.jpg',
    posterAlt: 'Official promotional poster for Fally Ipupa Live in Nairobi on 5 September 2026 at Uhuru Gardens',
    posterSourceUrl: 'https://www.ticketsasa.com/events/fally-ipupa-live-in-nairobi',
    verificationSource: 'Ticketsasa — current official seller listing',
    verificationSourceUrl: 'https://www.ticketsasa.com/events/fally-ipupa-live-in-nairobi',
    secondaryVerificationSourceUrl: 'https://www.fallyipupalive.com/',
    ticketTiers: [
      {
        name: 'Regular Offer (Limited)',
        category: TicketTypeCategory.REGULAR,
        price: 6000,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
        salesEnd: '2026-09-03T23:59:00+03:00',
      },
      {
        name: 'Wave 1 Regular Ticket',
        category: TicketTypeCategory.REGULAR,
        price: 10000,
        availabilityStatus: TicketAvailabilityStatus.CLOSED,
        salesEnd: '2026-08-31T23:59:00+03:00',
      },
      {
        name: 'VIP Offer (Limited)',
        category: TicketTypeCategory.VIP,
        price: 16000,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
        salesEnd: '2026-09-03T23:59:00+03:00',
      },
      {
        name: 'Wave 1 VVIP Ticket',
        category: TicketTypeCategory.VVIP,
        price: 40000,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
        salesEnd: '2026-09-04T23:59:00+03:00',
      },
      {
        name: 'VVIP Couple Ticket',
        category: TicketTypeCategory.VVIP,
        price: 60000,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
        description: 'Total price for a couple; not a per-person price.',
        salesEnd: '2026-09-05T15:00:00+03:00',
      },
    ],
  },
  {
    slug: 'roots-n-riddim-2026',
    title: 'Roots n Riddim',
    subtitle: 'Yussef Dayes, Venna and Elijah Fox in Nairobi',
    description:
      'Soul HQ and Nairobi R&B present Yussef Dayes for his debut East African performance, joined by Venna and Elijah Fox at Sk8City Nairobi.',
    organizerName: 'Soul HQ and Nairobi R&B',
    venue: 'Sk8City Nairobi',
    city: 'Nairobi',
    county: 'Nairobi',
    address: '12th Floor, Diamond Plaza 2, Nairobi',
    categoryIndex: 0,
    startAt: '2026-09-12T16:00:00+03:00',
    endAt: '2026-09-13T02:00:00+03:00',
    posterUrl: 'https://mookh-v3-public.lon1.digitaloceanspaces.com/events/event-featured-1784205723980-j57squ.jpeg',
    posterAlt: 'Official illustrated poster for Roots n Riddim in Nairobi on 12 September 2026',
    posterSourceUrl: 'https://mookh.com/roots-n-riddim/',
    verificationSource: 'Mookh — official seller listing by Nairobi R&B',
    verificationSourceUrl: 'https://mookh.com/roots-n-riddim/',
    secondaryVerificationSourceUrl: 'https://nairobieventsguide.com/upcoming-events/',
    ticketTiers: [
      {
        name: 'Phase 2 — General Admission',
        category: TicketTypeCategory.REGULAR,
        price: 4000,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
      },
      {
        name: 'Phase 2 — VIP',
        category: TicketTypeCategory.VIP,
        price: 7500,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
      },
      {
        name: 'Phase 2 — VVIP',
        category: TicketTypeCategory.VVIP,
        price: 12500,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
      },
    ],
  },
  {
    slug: 'too-early-for-birds-wangari-maathai-rerun-2026',
    title: 'Too Early For Birds WANGARĨ MAATHAI RERUN',
    subtitle: 'The ninth edition returns for five Nairobi performances',
    description:
      'Too Early For Birds restages its Wangarĩ Maathai production fifteen years after her passing. Five performances run from Friday evening through Sunday night at C. U. Shah Jain Bhavan.',
    organizerName: 'Too Early For Birds / Story Zetu',
    venue: 'C. U. Shah Jain Bhavan',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'C. U. Shah Jain Bhavan, Loresho, Nairobi',
    categoryIndex: 3,
    startAt: '2026-09-25T19:00:00+03:00',
    endAt: '2026-09-27T22:00:00+03:00',
    posterUrl: 'https://mookh-v3-public.lon1.digitaloceanspaces.com/events/featured/91f9fe13-9d3e-4b90-baf4-656bf08e8fff/IMG-20260430-WA0009.jpg',
    posterAlt: 'Official promotional poster for the Too Early For Birds Wangarĩ Maathai rerun, 25 to 27 September 2026',
    posterSourceUrl: 'https://mookh.com/too-early-for-birds-wangari-maathai-rerun/',
    verificationSource: 'Mookh — official TEFB Wangarĩ Maathai seller listing',
    verificationSourceUrl: 'https://mookh.com/too-early-for-birds-wangari-maathai-rerun/',
    secondaryVerificationSourceUrl: 'https://news.sanaapost.com/shawry-for-trees-the-shawry-is-back/',
    ticketTiers: [
      ...['Friday 7PM', 'Saturday 2PM', 'Saturday 7PM', 'Sunday 2PM', 'Sunday 7PM'].flatMap(
        (performance) => [
          {
            name: `Mukima Ticket — ${performance}`,
            category: TicketTypeCategory.REGULAR,
            price: 2800,
            availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
          },
          {
            name: `Mugumo Ticket — ${performance}`,
            category: TicketTypeCategory.VIP,
            price: 5000,
            availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
          },
          {
            name: `Forest of 4 Group Ticket — ${performance}`,
            category: TicketTypeCategory.VVIP,
            price: 10000,
            availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
            description: 'Total price for a group of four; not a per-person price.',
          },
        ],
      ),
    ],
  },
  {
    slug: 'peaches-and-cream-2026',
    title: 'Peaches & Cream',
    subtitle: 'A daytime celebration of soulful African sound',
    description:
      'A live music and lifestyle experience at Ngong Race Course and Golf Park, with African R&B, pop and house performances, food, markets and brand activations.',
    organizerName: 'Crispy Life Events',
    venue: 'Ngong Race Course and Golf Park',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Ngong Race Course and Golf Park, Nairobi',
    categoryIndex: 4,
    startAt: '2026-09-26T14:00:00+03:00',
    endAt: '2026-09-27T02:00:00+03:00',
    posterUrl: 'https://mookh-v3-public.lon1.digitaloceanspaces.com/events/featured/2982e52b-592b-4f8d-a60d-c3790708a749/ALL_PEACHES__CREAM_26TH_SEP__1X1_copy.jpg',
    posterAlt: 'Official Peaches & Cream event poster listing the 26 September 2026 Nairobi lineup',
    posterSourceUrl: 'https://mookh.com/peaches-and-cream/',
    verificationSource: 'Mookh — official Peaches & Cream seller listing',
    verificationSourceUrl: 'https://mookh.com/peaches-and-cream/',
    secondaryVerificationSourceUrl:
      'https://capitalfm.africa/crispy-life-events-announces-peaches-cream-a-new-daytime-afro-rnb-experience-coming-to-nairobi-on-26th-september/',
    ticketTiers: [
      {
        name: 'Early Bird — General Admission',
        category: TicketTypeCategory.EARLY_BIRD,
        price: 2000,
        availabilityStatus: TicketAvailabilityStatus.SOLD_OUT,
      },
      {
        name: 'Phase One — General Admission',
        category: TicketTypeCategory.REGULAR,
        price: 2500,
        availabilityStatus: TicketAvailabilityStatus.SOLD_OUT,
      },
      {
        name: 'Phase Two — General Admission',
        category: TicketTypeCategory.REGULAR,
        price: 3000,
        availabilityStatus: TicketAvailabilityStatus.SOLD_OUT,
      },
      {
        name: 'Phase Three — General Admission',
        category: TicketTypeCategory.REGULAR,
        price: 3500,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
      },
      {
        name: 'Final Phase — General Admission',
        category: TicketTypeCategory.REGULAR,
        price: 4000,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
      },
      {
        name: 'Early Bird — VIP Experience',
        category: TicketTypeCategory.VIP,
        price: 4000,
        availabilityStatus: TicketAvailabilityStatus.SOLD_OUT,
      },
      {
        name: 'Peach Pair — Group of Two',
        category: TicketTypeCategory.REGULAR,
        price: 5600,
        availabilityStatus: TicketAvailabilityStatus.CLOSED,
        description: 'Total price for a group of two; not a per-person price.',
      },
      {
        name: 'VIP Experience — Advance',
        category: TicketTypeCategory.VIP,
        price: 6000,
        availabilityStatus: TicketAvailabilityStatus.AVAILABLE,
      },
      {
        name: 'Four Good Times — Group of Four',
        category: TicketTypeCategory.VVIP,
        price: 11000,
        availabilityStatus: TicketAvailabilityStatus.CLOSED,
        description: 'Total price for a group of four; not a per-person price.',
      },
    ],
  },
  {
    slug: 'miles-of-melody-where-rhythm-roams-2026',
    title: 'Miles of Melody: Where Rhythm Roams',
    subtitle: 'The Catalog 254 — music, conversation and community',
    description:
      'An intimate afternoon built around music, conversation and community, with the featured artist in the room to unpack the creative process track by track.',
    organizerName: 'The Catalog 254',
    venue: 'Chronos',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Lavington, Nairobi',
    categoryIndex: 0,
    startAt: '2026-09-26T15:00:00+03:00',
    endAt: '2026-09-26T21:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Live singer performing under warm stage lights',
    verificationSource: 'TikoHUB',
    verificationSourceUrl: 'https://www.tikohub.com/events/miles-of-melody-where-rhythm-roams',
    ticketTiers: [
      { name: 'Entry ticket', category: TicketTypeCategory.REGULAR, price: 1000, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
  {
    slug: 'africa-concours-delegance-2026',
    title: 'Africa Concours d’Elegance 2026',
    subtitle: 'Vintage cars, classic motorcycles and Kenya motoring culture',
    description:
      'Kenya’s long-running classic motoring showcase returns to Ngong Racecourse with vintage and classic cars, motorcycles and a full day of automotive culture.',
    organizerName: 'Africa Concours d’Elegance',
    venue: 'Ngong Racecourse',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Ngong Road, Nairobi',
    categoryIndex: 4,
    startAt: '2026-09-27T09:00:00+03:00',
    endAt: '2026-09-27T18:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Classic sports car displayed outdoors',
    verificationSource: 'Little Events',
    verificationSourceUrl: 'https://apps.little.africa/events/55',
    secondaryVerificationSourceUrl: 'https://nairobieventsguide.com/event/2026-africa-concours-delegance/',
    ticketTiers: [
      { name: 'Advance adult', category: TicketTypeCategory.REGULAR, price: 1800, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
  {
    slug: 'first-rhumba-vip-affair-2026',
    title: 'The First Rhumba VIP Affair',
    subtitle: 'A premium live Rhumba night at Emara Ole-Sereni',
    description:
      'A premium Rhumba experience bringing together live bands, DJs, hospitality and an elegant evening atmosphere at Emara Ole-Sereni.',
    organizerName: 'Zeget Delongeur & E&F Sounds Entertainment',
    venue: 'Emara Ole-Sereni',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Mombasa Road, Nairobi',
    categoryIndex: 0,
    startAt: '2026-10-03T18:00:00+03:00',
    endAt: '2026-10-04T02:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Musician performing live on stage',
    verificationSource: 'TikoHUB',
    verificationSourceUrl: 'https://tikohub.com/events/the-first-rhumba-vip-affair',
    ticketTiers: [
      { name: 'VIP ticket', category: TicketTypeCategory.VIP, price: 3000, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
  {
    slug: 'safari-7s-2026',
    title: 'Safari 7s 2026',
    subtitle: 'Three days of rugby, entertainment and festival energy',
    description:
      'East Africa’s rugby festival returns to Nyayo Stadium for three days of sevens rugby, entertainment and a high-energy stadium atmosphere.',
    organizerName: 'Safari 7s',
    venue: 'Nyayo Stadium',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Nyayo National Stadium, Nairobi',
    categoryIndex: 2,
    startAt: '2026-10-09T07:30:00+03:00',
    endAt: '2026-10-11T20:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1515808266237-4f89cbe46c1c?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Rugby players competing on a green field',
    verificationSource: 'TikoHUB',
    verificationSourceUrl: 'https://tikohub.com/events/safari-7s-2026',
    ticketTiers: [
      { name: 'Friday regular', category: TicketTypeCategory.REGULAR, price: 300, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
  {
    slug: 'kulture-icons-soundtrack-2026',
    title: 'KULTURE: Celebrating the Icons & The Soundtrack',
    subtitle: 'A seated celebration of the music that shaped a generation',
    description:
      'An evening celebrating influential music and cultural icons, with red carpet arrivals followed by a gala show at the Tsavo Ballroom, KICC.',
    organizerName: 'KULTURE',
    venue: 'Tsavo Ballroom, KICC',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Kenyatta International Convention Centre, Nairobi',
    categoryIndex: 3,
    startAt: '2026-10-10T16:00:00+03:00',
    endAt: '2026-10-11T00:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Audience watching a theatrical stage performance',
    verificationSource: 'KULTURE',
    verificationSourceUrl: 'https://kulture.ke/',
    ticketTiers: [
      { name: 'Zone H', category: TicketTypeCategory.REGULAR, price: 2000, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
  {
    slug: 'pineapple-party-nairobi-2026',
    title: 'Pineapple Party',
    subtitle: 'A Saturday music and nightlife experience in Westlands',
    description:
      'A Nairobi weekend party experience at Nairobi Street Kitchen, bringing together music, food and a lively social crowd.',
    organizerName: 'Pineapple Party',
    venue: 'Nairobi Street Kitchen',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Mpaka Road, Westlands, Nairobi',
    categoryIndex: 0,
    startAt: '2026-10-10T16:00:00+03:00',
    endAt: '2026-10-11T02:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Crowd enjoying a colourful outdoor music event',
    verificationSource: 'Tipsi Tickets',
    verificationSourceUrl: 'https://www.tipsitickets.com/',
    ticketTiers: [
      { name: 'Entry', category: TicketTypeCategory.REGULAR, price: 1500, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
  {
    slug: 'midnight-royale-2026',
    title: 'Midnight Royale',
    subtitle: 'A late-night Nairobi experience at Carnivore Grounds',
    description:
      'A Saturday-to-Sunday entertainment experience at The Carnivore Grounds, with tickets from KES 1,500.',
    organizerName: 'Midnight Royale',
    venue: 'The Carnivore Grounds',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Langata Road, Nairobi',
    categoryIndex: 4,
    startAt: '2026-10-17T15:00:00+03:00',
    endAt: '2026-10-18T03:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Large concert crowd under red stage lighting',
    verificationSource: 'Tipsi Tickets',
    verificationSourceUrl: 'https://www.tipsitickets.com/',
    ticketTiers: [
      { name: 'Entry', category: TicketTypeCategory.REGULAR, price: 1500, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
  {
    slug: 'teen-pop-up-festival-2026',
    title: '2nd Edition Teen Pop Up Festival',
    subtitle: 'A daytime youth festival at Nairobi Arboretum',
    description:
      'A daytime festival at Nairobi Arboretum with affordable entry and a youth-focused mix of social, creative and entertainment experiences.',
    organizerName: 'Teen Pop Up Festival',
    venue: 'The Nairobi Arboretum',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'State House Road, Nairobi',
    categoryIndex: 4,
    startAt: '2026-10-24T06:00:00+03:00',
    endAt: '2026-10-24T16:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1496024840928-4c417adf211d?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Outdoor festival crowd in daylight',
    verificationSource: 'Tipsi Tickets',
    verificationSourceUrl: 'https://www.tipsitickets.com/',
    ticketTiers: [
      { name: 'Entry', category: TicketTypeCategory.REGULAR, price: 250, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
  {
    slug: 'ai-build-day-2nd-edition-2026',
    title: 'AI Build Day — 2nd Edition',
    subtitle: 'A technology build day at Strathmore University',
    description:
      'A hands-on technology event at Strathmore University for builders, developers and people interested in creating with AI.',
    organizerName: 'AI Build Day',
    venue: 'Strathmore University',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Madaraka Estate, Nairobi',
    categoryIndex: 1,
    startAt: '2026-11-06T06:00:00+03:00',
    endAt: '2026-11-06T14:00:00+03:00',
    posterUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=88',
    posterAlt: 'Developer working on code at a laptop',
    verificationSource: 'Tipsi Tickets',
    verificationSourceUrl: 'https://www.tipsitickets.com/',
    ticketTiers: [
      { name: 'Entry', category: TicketTypeCategory.REGULAR, price: 800, availabilityStatus: TicketAvailabilityStatus.AVAILABLE },
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  await prisma.user.upsert({
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

  await prisma.organizerProfile.upsert({
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

  const categoryNames = ['Music & Concerts', 'Tech & Business', 'Sports', 'Arts & Theatre', 'Festivals'];
  const categories: Awaited<ReturnType<typeof prisma.eventCategory.upsert>>[] = [];
  for (const name of categoryNames) {
    categories.push(
      await prisma.eventCategory.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { name, slug: slugify(name) },
      }),
    );
  }

  const listingsUser = await prisma.user.upsert({
    where: { email: 'listings@ticketflow.co.ke' },
    update: { isActive: true },
    create: {
      email: 'listings@ticketflow.co.ke',
      phone: '+254700000005',
      passwordHash: await hash(randomBytes(24).toString('hex')),
      firstName: 'TicketFlow',
      lastName: 'Listings',
      role: UserRole.ORGANIZER,
      isActive: true,
    },
  });

  const listingsProfile = await prisma.organizerProfile.upsert({
    where: { userId: listingsUser.id },
    // Verified, because tickets for this catalogue are now sold on TicketFlow
    // itself — `isEventBookable` and OrdersService both refuse an unverified
    // organizer.
    update: { isVerified: true, companyName: LISTINGS_COMPANY, description: LISTINGS_DESCRIPTION },
    create: {
      userId: listingsUser.id,
      companyName: LISTINGS_COMPANY,
      description: LISTINGS_DESCRIPTION,
      isVerified: true,
    },
  });

  for (const seedEvent of eventSeeds) {
    const eventData = {
      organizerId: listingsProfile.id,
      categoryId: categories[seedEvent.categoryIndex].id,
      title: seedEvent.title,
      subtitle: seedEvent.subtitle,
      description: seedEvent.description,
      posterUrl: seedEvent.posterUrl,
      posterAlt: seedEvent.posterAlt,
      posterSourceUrl: seedEvent.posterSourceUrl ?? null,
      venue: seedEvent.venue,
      city: seedEvent.city,
      county: seedEvent.county,
      address: seedEvent.address,
      organizerName: seedEvent.organizerName,
      startDateTime: new Date(seedEvent.startAt),
      endDateTime: new Date(seedEvent.endAt),
      timezone: 'Africa/Nairobi',
      status: EventStatus.PUBLISHED,
      isFeatured: true,
      // Ticketing happens on TicketFlow Kenya only. No listing carries an
      // outbound booking URL, so nothing can route a buyer off-site.
      bookingMode: EventBookingMode.INTERNAL,
      bookingUrl: null,
      verificationSource: seedEvent.verificationSource,
      verificationSourceUrl: seedEvent.verificationSourceUrl,
      secondaryVerificationSourceUrl: seedEvent.secondaryVerificationSourceUrl ?? null,
      verifiedAt: VERIFIED_AT,
      salesEnabled: true,
      isDemo: false,
    };

    const event = await prisma.event.upsert({
      where: { slug: seedEvent.slug },
      update: eventData,
      create: { ...eventData, slug: seedEvent.slug },
    });

    for (const tier of seedEvent.ticketTiers) {
      const existing = await prisma.ticketType.findFirst({
        where: { eventId: event.id, name: tier.name },
      });
      // TicketFlow now holds the inventory, so an open tier needs a real
      // allocation. Tiers the catalogue records as sold out or closed keep
      // zero stock rather than being given invented inventory.
      const allocation =
        tier.availabilityStatus === TicketAvailabilityStatus.AVAILABLE
          ? TIER_ALLOCATION[tier.category] ?? DEFAULT_TIER_ALLOCATION
          : 0;
      const tierData = {
        category: tier.category,
        price: tier.price,
        quantity: Math.max(allocation, existing?.quantitySold ?? 0),
        availabilityStatus: tier.availabilityStatus,
        description: tier.description,
        salesEnd: tier.salesEnd ? new Date(tier.salesEnd) : null,
      };

      if (existing) {
        await prisma.ticketType.update({ where: { id: existing.id }, data: tierData });
      } else {
        await prisma.ticketType.create({
          data: { eventId: event.id, name: tier.name, ...tierData },
        });
      }
    }

    const seededNames = seedEvent.ticketTiers.map((tier) => tier.name);
    const staleTiers = await prisma.ticketType.findMany({
      where: { eventId: event.id, name: { notIn: seededNames } },
    });
    for (const staleTier of staleTiers) {
      if (staleTier.quantitySold === 0) {
        await prisma.ticketType.delete({ where: { id: staleTier.id } });
      } else {
        console.warn(`Kept retired tier "${staleTier.name}" on ${event.title} because it has sales history.`);
      }
    }
  }

  // Archive, rather than delete, events outside the verified catalogue so
  // historical orders and QR tickets keep their referential integrity.
  const currentSlugs = eventSeeds.map((event) => event.slug);
  const now = new Date();
  const staleEvents = await prisma.event.findMany({
    where: { status: EventStatus.PUBLISHED, slug: { notIn: currentSlugs } },
  });
  for (const event of staleEvents) {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        status: event.endDateTime < now ? EventStatus.COMPLETED : EventStatus.CANCELLED,
        salesEnabled: false,
        isFeatured: false,
      },
    });
    console.log(`Archived stale listing "${event.title}".`);
  }

  console.log(`Seed complete: ${eventSeeds.length} verified events are published and bookable on TicketFlow.`);
  console.log('--- Login credentials ---');
  console.log('Admin:     admin@ticketflow.co.ke / Admin@123');
  console.log('Organizer: organizer@ticketflow.co.ke / Organizer@123');
  console.log('Customer1: customer1@ticketflow.co.ke / Customer@123');
  console.log('Customer2: customer2@ticketflow.co.ke / Customer@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
