import { ConfigService } from '@nestjs/config';
import { AdminBootstrapService } from '../src/admin/admin-bootstrap.service';

function make(user: any, env: Record<string, string> = {}) {
  const state = { user: user ? { ...user } : null, audits: [] as string[] };
  const prisma: any = {
    user: {
      findUnique: async () => (state.user ? { ...state.user } : null),
      update: async ({ data }: any) => Object.assign(state.user, data),
    },
  };
  const audit: any = { log: async ({ action }: any) => state.audits.push(action) };
  return { state, svc: new AdminBootstrapService(prisma, new ConfigService(env), audit) };
}

describe('AdminBootstrapService', () => {
  const saved = process.env.BOOTSTRAP_ADMIN_EMAIL;
  afterEach(() => (saved === undefined ? delete process.env.BOOTSTRAP_ADMIN_EMAIL : (process.env.BOOTSTRAP_ADMIN_EMAIL = saved)));

  it('promotes an existing customer and audit-logs it', async () => {
    const { state, svc } = make({ id: 'u1', email: 'a@b.co', role: 'CUSTOMER', isActive: true, passwordHash: 'keep' });
    expect(await svc.promote('a@b.co')).toBe('promoted');
    expect(state.user).toMatchObject({ role: 'ADMIN', isActive: true, passwordHash: 'keep' });
    expect(state.audits).toEqual(['ADMIN_BOOTSTRAP_PROMOTED']);
  });

  it('never creates an account', async () => {
    const { svc } = make(null);
    expect(await svc.promote('nobody@b.co')).toBe('not-found');
  });

  it('is a no-op for an active admin', async () => {
    const { state, svc } = make({ id: 'u1', email: 'a@b.co', role: 'ADMIN', isActive: true });
    expect(await svc.promote('a@b.co')).toBe('already-admin');
    expect(state.audits).toEqual([]);
  });

  it('does nothing when the variable is unset', async () => {
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    const { state, svc } = make({ id: 'u1', email: 'a@b.co', role: 'CUSTOMER', isActive: true });
    await svc.onApplicationBootstrap();
    expect(state.user.role).toBe('CUSTOMER');
  });
});
