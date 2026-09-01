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
  posterSourceUrl: string;
  bookingUrl: string;
  verificationSource: string;
  verificationSourceUrl: string;
  secondaryVerificationSourceUrl: string;
  ticketTiers: SeedTier[];
};

const VERIFIED_AT = new Date('2026-09-01T00:00:00+03:00');

// Verified on 1 September 2026 (Africa/Nairobi). These are editorial listings
// for real third-party events. TicketFlow is not their seller: every Book Now
// action goes to the listed authorised platform and server-side sales stay off.
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
    bookingUrl: 'https://www.ticketsasa.com/events/fally-ipupa-live-in-nairobi',
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
    bookingUrl: 'https://mookh.com/roots-n-riddim/',
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
    bookingUrl: 'https://mookh.com/too-early-for-birds-wangari-maathai-rerun/',
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
    bookingUrl: 'https://mookh.com/peaches-and-cream/',
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
    update: { isActive: false },
    create: {
      email: 'listings@ticketflow.co.ke',
      phone: '+254700000005',
      passwordHash: await hash(randomBytes(24).toString('hex')),
      firstName: 'TicketFlow',
      lastName: 'Listings',
      role: UserRole.ORGANIZER,
      isActive: false,
    },
  });

  const listingsProfile = await prisma.organizerProfile.upsert({
    where: { userId: listingsUser.id },
    update: { isVerified: false },
    create: {
      userId: listingsUser.id,
      companyName: 'TicketFlow Kenya Listings Desk',
      description:
        'Editorial event listings. Ticket sales remain with each event organizer or authorised external seller.',
      isVerified: false,
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
      posterSourceUrl: seedEvent.posterSourceUrl,
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
      bookingMode: EventBookingMode.EXTERNAL,
      bookingUrl: seedEvent.bookingUrl,
      verificationSource: seedEvent.verificationSource,
      verificationSourceUrl: seedEvent.verificationSourceUrl,
      secondaryVerificationSourceUrl: seedEvent.secondaryVerificationSourceUrl,
      verifiedAt: VERIFIED_AT,
      salesEnabled: false,
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
      const tierData = {
        category: tier.category,
        price: tier.price,
        // External listings have no TicketFlow inventory. Availability comes
        // only from the explicit status copied from the official seller.
        quantity: existing?.quantitySold ?? 0,
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

  console.log(`Seed complete: ${eventSeeds.length} verified external events are published.`);
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
