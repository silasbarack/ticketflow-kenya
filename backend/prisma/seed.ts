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

  const customer1 = await prisma.user.upsert({
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

  const customer2 = await prisma.user.upsert({
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

  // Events
  const eventSeeds = [
    {
      title: 'Nairobi Music Festival 2026',
      description: 'A weekend of live performances from top Kenyan and East African artists.',
      venue: 'Uhuru Gardens',
      city: 'Nairobi',
      categoryIndex: 0,
      daysFromNow: 30,
      imageKeywords: 'kenya,concert,music,crowd',
    },
    {
      title: 'Kenya Tech Summit',
      description: 'Annual gathering of developers, startups, and investors shaping the Kenyan tech ecosystem.',
      venue: 'KICC',
      city: 'Nairobi',
      categoryIndex: 1,
      daysFromNow: 45,
      imageKeywords: 'kenya,nairobi,conference,technology',
    },
    {
      title: 'Mombasa Beach Sports Gala',
      description: 'Beach volleyball, football tournaments, and live entertainment on the coast.',
      venue: 'Nyali Beach Grounds',
      city: 'Mombasa',
      categoryIndex: 2,
      daysFromNow: 20,
      imageKeywords: 'kenya,mombasa,beach,ocean',
    },
    {
      title: 'Nairobi Theatre Night',
      description: 'An evening of contemporary Kenyan theatre and spoken word performances.',
      venue: 'Kenya National Theatre',
      city: 'Nairobi',
      categoryIndex: 3,
      daysFromNow: 15,
      imageKeywords: 'kenya,nairobi,theatre,performance',
    },
    {
      title: 'Lake Naivasha Cultural Festival',
      description: 'Celebrating Kenyan culture through food, music, and craft markets.',
      venue: 'Lake Naivasha Resort Grounds',
      city: 'Naivasha',
      categoryIndex: 4,
      daysFromNow: 60,
      imageKeywords: 'kenya,africa,culture,festival',
    },
  ];

  for (const [index, seedEvent] of eventSeeds.entries()) {
    const start = new Date();
    start.setDate(start.getDate() + seedEvent.daysFromNow);
    const end = new Date(start);
    end.setHours(end.getHours() + 6);

    // lock=<n> pins a specific real photo from LoremFlickr's keyword pool so the
    // same event always shows the same image instead of a random one per request.
    const posterUrl = `https://loremflickr.com/800/800/${seedEvent.imageKeywords}?lock=${index + 1}`;

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
