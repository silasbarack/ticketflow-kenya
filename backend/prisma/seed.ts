import { PrismaClient, UserRole, EventStatus, TicketTypeCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  // Featured events — August 2026 lineup
  const eventSeeds = [
    {
      title: 'Watamu Ocean & Seafood Festival',
      description:
        'A two-day coastal celebration on Watamu Beach: fresh seafood grills and Swahili food stalls, dhow sailing races at high tide, tide-pool and marine park tours, and taarab and bango bands playing into the sunset.',
      venue: 'Watamu Beach',
      city: 'Watamu',
      categoryIndex: 4,
      date: '2026-08-01',
      startHour: 10,
      durationDays: 1,
      endHour: 22,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/watamu-ocean-seafood-festival.jpg',
    },
    {
      title: 'August Nights: Afro-Fusion Live',
      description:
        'One night, one big stage at Uhuru Gardens: an afro-fusion lineup running from benga and rhumba classics to gengetone and Afrobeats headliners, with a full festival light show, food trucks, and late-night DJ sets.',
      venue: 'Uhuru Gardens',
      city: 'Nairobi',
      categoryIndex: 0,
      date: '2026-08-08',
      startHour: 18,
      durationDays: 0,
      endHour: 23,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/august-nights-afro-fusion-live.jpg',
    },
    {
      title: 'Coast Sevens Rugby Festival',
      description:
        'Sixteen club sides battle it out over a fast-and-loose weekend of sevens rugby at Mombasa Sports Club - non-stop matches, a family fan village, halftime entertainment, and the coast derby final on Sunday evening.',
      venue: 'Mombasa Sports Club',
      city: 'Mombasa',
      categoryIndex: 2,
      date: '2026-08-15',
      startHour: 9,
      durationDays: 1,
      endHour: 18,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/coast-sevens-rugby-festival.jpg',
    },
    {
      title: 'Nairobi Fintech & AI Summit 2026',
      description:
        "Two days of keynotes, panels, and live demos on where Kenyan fintech is heading: mobile money APIs, AI in credit scoring, agent banking, and regulation - plus a startup pitch arena and investor office hours at Sarit Expo Centre.",
      venue: 'Sarit Expo Centre',
      city: 'Nairobi',
      categoryIndex: 1,
      date: '2026-08-19',
      startHour: 9,
      durationDays: 1,
      endHour: 17,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/nairobi-fintech-ai-summit-2026.jpg',
    },
    {
      title: 'Sanaa Live: Spoken Word & Theatre Night',
      description:
        "An evening at the Kenya National Theatre mixing spoken word and slam poetry with two new one-act plays and a contemporary dance piece - followed by a talkback with the performers and directors.",
      venue: 'Kenya National Theatre',
      city: 'Nairobi',
      categoryIndex: 3,
      date: '2026-08-23',
      startHour: 17,
      durationDays: 0,
      endHour: 22,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/sanaa-live-spoken-word-theatre-night.jpg',
    },
    {
      title: 'Nairobi Coffee & Culture Festival',
      description:
        'A full day at Ngong Racecourse celebrating Kenyan coffee from farm to cup: cuppings with roasters from Kiambu to Kisii, a barista latte-art championship, a craft and vinyl market, and an acoustic stage all afternoon.',
      venue: 'Ngong Racecourse',
      city: 'Nairobi',
      categoryIndex: 4,
      date: '2026-08-29',
      startHour: 10,
      durationDays: 0,
      endHour: 20,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/nairobi-coffee-culture-festival.jpg',
    },
  ];

  for (const [index, seedEvent] of eventSeeds.entries()) {
    const [year, month, day] = seedEvent.date.split('-').map(Number);
    const start = new Date(year, month - 1, day, seedEvent.startHour, 0, 0, 0);
    const end = new Date(year, month - 1, day + seedEvent.durationDays, seedEvent.endHour, 0, 0, 0);

    const posterUrl = seedEvent.posterUrl;

    const event = await prisma.event.upsert({
      where: { slug: slugify(seedEvent.title) },
      update: { posterUrl, description: seedEvent.description },
      create: {
        organizerId: organizerProfile.id,
        categoryId: categories[seedEvent.categoryIndex].id,
        title: seedEvent.title,
        slug: slugify(seedEvent.title),
        description: seedEvent.description,
        posterUrl,
        venue: seedEvent.venue,
        city: seedEvent.city,
        address: `${seedEvent.venue}, ${seedEvent.city}`,
        startDateTime: start,
        endDateTime: end,
        status: EventStatus.PUBLISHED,
        isFeatured: true,
      },
    });

    const ticketTypeSeeds = [
      { name: 'Early Bird', category: TicketTypeCategory.EARLY_BIRD, price: 1000, quantity: 50 },
      { name: 'Regular', category: TicketTypeCategory.REGULAR, price: 1500, quantity: 200 },
      { name: 'VIP', category: TicketTypeCategory.VIP, price: 3500, quantity: 80 },
      { name: 'VVIP', category: TicketTypeCategory.VVIP, price: 7500, quantity: 20 },
      { name: 'Student', category: TicketTypeCategory.STUDENT, price: 700, quantity: 100 },
    ];

    for (const tt of ticketTypeSeeds) {
      const existing = await prisma.ticketType.findFirst({
        where: { eventId: event.id, name: tt.name },
      });
      if (!existing) {
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
  }

  // Retire any previously-seeded events that aren't in the current lineup
  // above (soft "replace": CANCELLED instead of deleted, since Order rows
  // reference events with onDelete: Restrict, and cancelled events simply
  // no longer show up in the public /events listing).
  const currentSlugs = eventSeeds.map((e) => slugify(e.title));
  const stale = await prisma.event.findMany({
    where: {
      organizerId: organizerProfile.id,
      status: EventStatus.PUBLISHED,
      slug: { notIn: currentSlugs },
    },
  });
  for (const event of stale) {
    await prisma.event.update({ where: { id: event.id }, data: { status: EventStatus.CANCELLED } });
    console.log(`Retired stale seed event: ${event.title}`);
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
