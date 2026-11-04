import * as jwt from 'jsonwebtoken';
import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import { AiProvider, AiProviderError, AiProviderResult, AiStructuredRequest } from '../../src/ai/providers/ai-provider.interface';

/**
 * Integration tests run against TEST_DATABASE_URL (a throwaway database), never
 * the dev database. They are skipped when it is not set.
 */
export const TEST_DB = process.env.TEST_DATABASE_URL;

/** Scriptable stand-in for a real model. Records every prompt it receives. */
export class FakeAiProvider implements AiProvider {
  readonly name = 'fake';
  readonly model = 'claude-opus-5-5';
  configured = true;
  calls: AiStructuredRequest<unknown>[] = [];
  respond: (req: AiStructuredRequest<unknown>) => Partial<AiProviderResult> | Promise<Partial<AiProviderResult>> = () => ({ output: null });

  isConfigured() {
    return this.configured;
  }

  async generateStructured<T>(request: AiStructuredRequest<T>): Promise<AiProviderResult> {
    this.calls.push(request as AiStructuredRequest<unknown>);
    const r = await this.respond(request as AiStructuredRequest<unknown>);
    return { output: null, model: this.model, inputTokens: 1200, outputTokens: 400, refused: false, ...r };
  }

  outage() {
    this.respond = () => {
      throw new AiProviderError('AI provider could not be reached', 'UNREACHABLE', true);
    };
  }
}

export function tokenFor(user: { id: string; email: string; role: string }) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

export function client(baseURL: string, token?: string): AxiosInstance {
  return axios.create({
    baseURL,
    validateStatus: () => true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export const RUN = Math.random().toString(36).slice(2, 8);

export async function seed(prisma: PrismaClient) {
  const mkUser = (role: 'ADMIN' | 'ORGANIZER' | 'CUSTOMER', name: string) =>
    prisma.user.create({
      data: { email: `${name}-${RUN}@test.local`, passwordHash: 'x', firstName: name, lastName: 'Test', role },
    });

  const [admin, orgA, orgB, c1, c2] = await Promise.all([
    mkUser('ADMIN', 'admin'),
    mkUser('ORGANIZER', 'orga'),
    mkUser('ORGANIZER', 'orgb'),
    mkUser('CUSTOMER', 'cust1'),
    mkUser('CUSTOMER', 'cust2'),
  ]);
  const category = await prisma.eventCategory.create({ data: { name: `Music ${RUN}`, slug: `music-${RUN}` } });
  const profileA = await prisma.organizerProfile.create({
    data: { userId: orgA.id, companyName: 'Org A Ltd', isVerified: true, verificationStatus: 'VERIFIED' },
  });
  const profileB = await prisma.organizerProfile.create({
    data: { userId: orgB.id, companyName: 'Org B Ltd', isVerified: true, verificationStatus: 'SUBMITTED', verificationSubmittedAt: new Date(Date.now() - 3 * 86_400_000) },
  });

  const day = 86_400_000;
  const mkEvent = (organizerId: string, title: string, status: 'PUBLISHED' | 'DRAFT', inDays: number) =>
    prisma.event.create({
      data: {
        organizerId,
        categoryId: category.id,
        title,
        slug: `${title.toLowerCase().replace(/\s+/g, '-')}-${RUN}`,
        description: 'A real test event with live music and food stalls.',
        venue: 'KICC',
        city: 'Nairobi',
        startDateTime: new Date(Date.now() + inDays * day),
        endDateTime: new Date(Date.now() + inDays * day + 4 * 3_600_000),
        status,
        ticketTypes: { create: [{ name: 'Regular', price: 1500, quantity: 100 }, { name: 'VIP', price: 5000, quantity: 20 }] },
      },
      include: { ticketTypes: true },
    });

  const eventA = await mkEvent(profileA.id, `Nairobi Jazz Night ${RUN}`, 'PUBLISHED', 10);
  const eventB = await mkEvent(profileB.id, `Mombasa Beach Fest ${RUN}`, 'PUBLISHED', 30);
  const draftEvent = await mkEvent(profileA.id, `Secret Draft ${RUN}`, 'DRAFT', 5);

  return { admin, orgA, orgB, c1, c2, category, profileA, profileB, eventA, eventB, draftEvent };
}

let orderSeq = 0;
export async function createOrder(
  prisma: PrismaClient,
  params: { userId: string; eventId: string; ticketTypeId: string; quantity: number; unitPrice: number; status: 'PENDING' | 'PAID' },
) {
  const subtotal = params.unitPrice * params.quantity;
  const fee = Math.round(subtotal * 0.09);
  return prisma.order.create({
    data: {
      orderNumber: `TFK-${RUN}-${++orderSeq}`,
      userId: params.userId,
      eventId: params.eventId,
      status: params.status,
      totalAmount: subtotal + fee,
      platformFee: fee,
      organizerEarning: subtotal,
      items: { create: [{ ticketTypeId: params.ticketTypeId, quantity: params.quantity, unitPrice: params.unitPrice, subtotal }] },
    },
  });
}

/** Removes everything this run created, children first. */
export async function cleanup(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ where: { email: { endsWith: `-${RUN}@test.local` } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const orders = await prisma.order.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  const tickets = await prisma.ticket.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });

  await prisma.checkIn.deleteMany({ where: { ticketId: { in: tickets.map((t) => t.id) } } });
  await prisma.ticket.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.platformCommission.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.event.deleteMany({ where: { slug: { endsWith: `-${RUN}` } } });
  await prisma.eventCategory.deleteMany({ where: { slug: `music-${RUN}` } });
  await prisma.supportTicket.deleteMany({});
  await prisma.supportConversation.deleteMany({});
  await prisma.aiDraft.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.aiUsageLog.deleteMany({});
  await prisma.aiFeatureSetting.deleteMany({});
  await prisma.automationJob.deleteMany({});
  await prisma.operationalAlert.deleteMany({});
  await prisma.eventView.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userPreference.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { actorId: null }] } });
  await prisma.organizerProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
