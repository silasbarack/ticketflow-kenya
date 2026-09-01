import { EventItem, TicketType } from '@/types/event';

/**
 * The six TicketFlow Kenya sample events, mirroring `backend/prisma/seed.ts`
 * exactly — same titles, venues, dates, descriptions, tier names and prices.
 *
 * The price ladders matter: they are printed onto the poster artwork
 * (`frontend/scripts/generate-posters.py`), so if these drift from the seed the
 * app shows one price while the poster behind it shows another. Keep all three
 * in sync.
 *
 * This is demo data — `USE_MOCK_DATA` must be `false` in production.
 */

/** Matches the backend's stored `posterUrl`; resolved by `resolvePosterSource`. */
const posterFor = (slug: string) => `/posters/${slug}.jpg`;

function tier(
  eventId: string,
  name: string,
  price: number,
  quantityAvailable: number,
  quantityRemaining: number,
): TicketType {
  return {
    id: `${eventId}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    eventId,
    name,
    description: null,
    price,
    quantityAvailable,
    quantityRemaining,
    salesStart: null,
    salesEnd: null,
  };
}

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt-watamu-ocean-seafood',
    title: 'Watamu Ocean & Seafood Festival',
    slug: 'watamu-ocean-seafood-festival',
    shortDescription: 'A coastal celebration of fresh seafood, dhow races and sunset taarab on Watamu Beach.',
    description:
      'A two-day coastal celebration on Watamu Beach: fresh seafood grills and Swahili food stalls, dhow sailing races at high tide, tide-pool and marine park tours, and taarab and bango bands playing into the sunset.',
    posterUrl: posterFor('watamu-ocean-seafood-festival'),
    venue: 'Watamu Beach',
    city: 'Watamu',
    startsAt: '2026-08-01T10:00:00.000Z',
    endsAt: '2026-08-02T22:00:00.000Z',
    organizerName: 'Coastal Experiences Ltd',
    category: 'Festivals',
    status: 'PUBLISHED',
    featured: true,
    ticketTypes: [
      tier('evt-watamu-ocean-seafood', 'Student', 500, 150, 96),
      tier('evt-watamu-ocean-seafood', 'Early Bird', 800, 200, 0),
      tier('evt-watamu-ocean-seafood', 'Regular', 1200, 600, 414),
      tier('evt-watamu-ocean-seafood', 'VIP Beach Deck', 2500, 120, 33),
      tier('evt-watamu-ocean-seafood', 'VVIP Cabana', 5000, 30, 7),
    ],
  },
  {
    id: 'evt-august-nights-afro-fusion',
    title: 'August Nights: Afro-Fusion Live',
    slug: 'august-nights-afro-fusion-live',
    shortDescription: 'A high-energy night of live Afro-fusion performances under Nairobi’s biggest stage lights.',
    description:
      'One night, one big stage at Uhuru Gardens: an afro-fusion lineup running from benga and rhumba classics to gengetone and Afrobeats headliners, with a full festival light show, food trucks, and late-night DJ sets.',
    posterUrl: posterFor('august-nights-afro-fusion-live'),
    venue: 'Uhuru Gardens',
    city: 'Nairobi',
    startsAt: '2026-08-08T15:00:00.000Z',
    endsAt: '2026-08-08T20:00:00.000Z',
    organizerName: 'Sauti Live Productions',
    category: 'Music',
    status: 'PUBLISHED',
    featured: true,
    ticketTypes: [
      tier('evt-august-nights-afro-fusion', 'Student', 1000, 300, 184),
      tier('evt-august-nights-afro-fusion', 'Early Bird', 1500, 500, 0),
      tier('evt-august-nights-afro-fusion', 'Regular', 2000, 2000, 1310),
      tier('evt-august-nights-afro-fusion', 'VIP', 5000, 300, 92),
      tier('evt-august-nights-afro-fusion', 'VVIP Front Stage', 10000, 80, 21),
    ],
  },
  {
    id: 'evt-coast-sevens-rugby',
    title: 'Coast Sevens Rugby Festival',
    slug: 'coast-sevens-rugby-festival',
    shortDescription: 'Fast-paced sevens rugby action from Kenya’s top coastal clubs at Mombasa Sports Club.',
    description:
      'Sixteen club sides battle it out over a fast-and-loose weekend of sevens rugby at Mombasa Sports Club - non-stop matches, a family fan village, halftime entertainment, and the coast derby final on Sunday evening.',
    posterUrl: posterFor('coast-sevens-rugby-festival'),
    venue: 'Mombasa Sports Club',
    city: 'Mombasa',
    startsAt: '2026-08-15T08:00:00.000Z',
    endsAt: '2026-08-16T18:00:00.000Z',
    organizerName: 'Coast Rugby Union',
    category: 'Sports',
    status: 'PUBLISHED',
    featured: false,
    ticketTypes: [
      tier('evt-coast-sevens-rugby', 'Student', 300, 400, 268),
      tier('evt-coast-sevens-rugby', 'Early Bird', 500, 500, 0),
      tier('evt-coast-sevens-rugby', 'Regular Terraces', 800, 1500, 1044),
      tier('evt-coast-sevens-rugby', 'VIP Grandstand', 2000, 200, 57),
      tier('evt-coast-sevens-rugby', 'VVIP Hospitality', 4500, 50, 9),
    ],
  },
  {
    id: 'evt-nairobi-fintech-ai-summit',
    title: 'Nairobi Fintech & AI Summit 2026',
    slug: 'nairobi-fintech-ai-summit-2026',
    shortDescription: 'Leaders in banking, mobile money and AI gather at Sarit Expo Centre.',
    description:
      'Two days of keynotes, panels, and live demos on where Kenyan fintech is heading: mobile money APIs, AI in credit scoring, agent banking, and regulation - plus a startup pitch arena and investor office hours at Sarit Expo Centre.',
    posterUrl: posterFor('nairobi-fintech-ai-summit-2026'),
    venue: 'Sarit Expo Centre',
    city: 'Nairobi',
    startsAt: '2026-08-19T07:00:00.000Z',
    endsAt: '2026-08-20T16:00:00.000Z',
    organizerName: 'Fintech Kenya Association',
    category: 'Conferences',
    status: 'PUBLISHED',
    featured: true,
    ticketTypes: [
      tier('evt-nairobi-fintech-ai-summit', 'Student', 1500, 100, 62),
      tier('evt-nairobi-fintech-ai-summit', 'Early Bird', 3500, 150, 0),
      tier('evt-nairobi-fintech-ai-summit', 'Regular Delegate', 5500, 400, 281),
      tier('evt-nairobi-fintech-ai-summit', 'VIP Executive', 9500, 80, 24),
      tier('evt-nairobi-fintech-ai-summit', 'VVIP Investor Lounge', 15000, 25, 6),
    ],
  },
  {
    id: 'evt-sanaa-live-spoken-word',
    title: 'Sanaa Live: Spoken Word & Theatre Night',
    slug: 'sanaa-live-spoken-word-theatre-night',
    shortDescription: 'An intimate evening of spoken word, poetry and short-form theatre at Kenya National Theatre.',
    description:
      'An evening at the Kenya National Theatre mixing spoken word and slam poetry with two new one-act plays and a contemporary dance piece - followed by a talkback with the performers and directors.',
    posterUrl: posterFor('sanaa-live-spoken-word-theatre-night'),
    venue: 'Kenya National Theatre',
    city: 'Nairobi',
    startsAt: '2026-08-23T14:00:00.000Z',
    endsAt: '2026-08-23T19:00:00.000Z',
    organizerName: 'Sanaa Collective',
    category: 'Theatre',
    status: 'PUBLISHED',
    featured: false,
    ticketTypes: [
      tier('evt-sanaa-live-spoken-word', 'Student', 500, 120, 74),
      tier('evt-sanaa-live-spoken-word', 'Early Bird', 700, 100, 0),
      tier('evt-sanaa-live-spoken-word', 'Regular', 1000, 250, 163),
      tier('evt-sanaa-live-spoken-word', 'VIP Front Row', 2000, 40, 11),
    ],
  },
  {
    id: 'evt-nairobi-coffee-culture',
    title: 'Nairobi Coffee & Culture Festival',
    slug: 'nairobi-coffee-culture-festival',
    shortDescription: 'A celebration of Kenyan coffee, craft and live culture at Ngong Racecourse.',
    description:
      'A full day at Ngong Racecourse celebrating Kenyan coffee from farm to cup: cuppings with roasters from Kiambu to Kisii, a barista latte-art championship, a craft and vinyl market, and an acoustic stage all afternoon.',
    posterUrl: posterFor('nairobi-coffee-culture-festival'),
    venue: 'Ngong Racecourse',
    city: 'Nairobi',
    startsAt: '2026-08-29T07:00:00.000Z',
    endsAt: '2026-08-29T17:00:00.000Z',
    organizerName: 'Nairobi Culture Collective',
    category: 'Festivals',
    status: 'PUBLISHED',
    featured: false,
    ticketTypes: [
      tier('evt-nairobi-coffee-culture', 'Student', 600, 200, 131),
      tier('evt-nairobi-coffee-culture', 'Early Bird', 900, 250, 0),
      tier('evt-nairobi-coffee-culture', 'Regular', 1300, 800, 552),
      tier('evt-nairobi-coffee-culture', 'VIP Tasting Pass', 2800, 150, 43),
    ],
  },
];

export function findMockEvent(eventId: string): EventItem | undefined {
  return MOCK_EVENTS.find((e) => e.id === eventId);
}
