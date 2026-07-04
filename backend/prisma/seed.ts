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

  // Featured events
  const eventSeeds = [
    {
      title: '7th Annual Dance Life Festival 2026',
      description:
        "Kenya's premier dance showcase returns for its 7th year, bringing together the country's finest choreographers, dance crews, and performers for three days of movement, culture, and celebration at the Kenya National Theatre.",
      venue: 'Kenya National Theatre',
      city: 'Nairobi',
      categoryIndex: 3,
      daysFromNow: 0,
      durationDays: 2,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/dance-life-festival-2026.jpg',
    },
    {
      title: 'Destination Rhumba - Sounds of Afrika',
      description:
        "An unforgettable night of classic and contemporary rhumba, live horns, and Afrika's finest sounds at Hillpark Hotels. Dress sharp, come dance.",
      venue: 'Hillpark Hotels',
      city: 'Nairobi',
      categoryIndex: 0,
      daysFromNow: 1,
      durationDays: 0,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/destination-rhumba-sounds-of-afrika.jpg',
    },
    {
      title: 'Bizarre Bazaar Summer Festival',
      description:
        'A two-day summer market festival at the Kenya School of TVET featuring local vendors, street food, live performances, and family-friendly activities.',
      venue: 'Kenya School of TVET',
      city: 'Nairobi',
      categoryIndex: 4,
      daysFromNow: 1,
      durationDays: 1,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/bizarre-bazaar-summer-festival.jpg',
    },
    {
      title: 'The Monument - 06.16 Festival',
      description:
        'A night festival at ASK Arena built around live instrumentation, atmosphere, and sound - The Monument brings a moody, intimate festival experience under the stars.',
      venue: 'ASK Arena',
      city: 'Nairobi',
      categoryIndex: 4,
      daysFromNow: 7,
      durationDays: 0,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/the-monument-0616-festival.jpg',
    },
    {
      title: 'Sidenotes Vol. 1 - R&B Experience',
      description:
        "The first installment of Sidenotes brings Nairobi's smoothest R&B sounds to the Nairobi National Museum Amphitheatre for an intimate evening under the stars.",
      venue: 'Nairobi National Museum Amphitheatre',
      city: 'Nairobi',
      categoryIndex: 0,
      daysFromNow: 7,
      durationDays: 0,
      posterUrl: 'https://ticketflow-frontend-w47s.onrender.com/posters/sidenotes-vol-1-rnb-experience.jpg',
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
