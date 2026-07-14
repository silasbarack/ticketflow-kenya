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

  // Featured events
  const eventSeeds = [
    {
      title: 'Sundown Sessions: Live at Carnivore',
      description:
        'An open-air evening of live Kenyan bands, rhumba classics, and Afrobeat sets at Carnivore Grounds - full bar, nyama choma stalls, and dancing under the string lights until late.',
      venue: 'Carnivore Grounds',
      city: 'Nairobi',
      categoryIndex: 0,
      daysFromNow: 16,
      durationDays: 0,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/sundown-sessions-live-at-carnivore.jpg',
    },
    {
      title: 'Nairobi Innovation Week',
      description:
        "Three days of keynotes, startup pitch sessions, and hands-on workshops bringing together Kenya's tech founders, investors, and engineers at the iconic KICC towers in the heart of Nairobi.",
      venue: 'Kenyatta International Convention Centre (KICC)',
      city: 'Nairobi',
      categoryIndex: 1,
      daysFromNow: 33,
      durationDays: 2,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/nairobi-innovation-week.jpg',
    },
    {
      title: 'Mombasa Beach Games',
      description:
        'A weekend of beach volleyball, kitesurfing exhibitions, and a coastal fun run on the white sands of Diani Beach, with live commentary, food vendors, and a sunset bonfire to close out day one.',
      venue: 'Diani Beach',
      city: 'Mombasa',
      categoryIndex: 2,
      daysFromNow: 24,
      durationDays: 1,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/mombasa-beach-games.jpg',
    },
    {
      title: 'The Nairobi Playwrights Showcase',
      description:
        "A curated evening of new one-act plays from Kenya's rising playwrights, staged by the Kenya National Theatre's resident company, followed by a talkback with the cast and directors.",
      venue: 'Kenya National Theatre',
      city: 'Nairobi',
      categoryIndex: 3,
      daysFromNow: 10,
      durationDays: 1,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/the-nairobi-playwrights-showcase.jpg',
    },
    {
      title: 'Nairobi Street Food & Culture Festival',
      description:
        'A weekend celebration of Kenyan street food, Maasai market crafts, and live cultural performances, bringing vendors from across the country together for tastings, music, and family activities.',
      venue: 'The Village Market',
      city: 'Nairobi',
      categoryIndex: 4,
      daysFromNow: 40,
      durationDays: 1,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/nairobi-street-food-culture-festival.jpg',
    },
    {
      title: 'Lake Naivasha Sunset Festival',
      description:
        'A laid-back lakeside festival of live acoustic sets, boat rides, and sundowner cocktails on the shores of Lake Naivasha, capped with a golden-hour sunset over the water.',
      venue: 'Lake Naivasha',
      city: 'Naivasha',
      categoryIndex: 4,
      daysFromNow: 54,
      durationDays: 0,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/lake-naivasha-sunset-festival.jpg',
    },
  ];

  for (const [index, seedEvent] of eventSeeds.entries()) {
    const start = new Date();
    start.setDate(start.getDate() + seedEvent.daysFromNow);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + seedEvent.durationDays);
    end.setHours(23, 0, 0, 0);

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
