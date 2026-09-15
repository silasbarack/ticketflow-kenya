'use client';

import Link from 'next/link';
import { Mail, Palette, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import RequireRole from '@/components/RequireRole';
import Badge from '@/components/ui/Badge';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';
import { buttonVariants } from '@/components/ui/Button';

function AccountSettingsContent() {
  const { user } = useAuth();
  if (!user) return null;

  const rows = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone || 'Not set' },
    { icon: UserIcon, label: 'Account type', value: user.role },
    { icon: ShieldCheck, label: 'Access status', value: user.isActive ? 'Active' : 'Suspended' },
  ];

  return (
    <main className="min-h-[calc(100vh-var(--header-height))] bg-cream py-8 sm:py-11">
      <Container className="max-w-3xl">
        <PageHeader eyebrow="Account" title="Profile and settings" description="Review the identity and contact details associated with your TicketFlow account." actions={<Link href="/settings/appearance" className={buttonVariants({ variant: 'outline', size: 'sm' })}><Palette className="h-4 w-4" aria-hidden="true" />Appearance</Link>} />

        <section className="mt-7 overflow-hidden rounded-card border border-line bg-white shadow-soft">
          <div className="flex items-center gap-4 border-b border-line p-5 sm:p-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-card bg-ink-950 text-lg font-extrabold text-white">{`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()}</span>
            <div><p className="text-lg font-extrabold text-navy-900">{user.firstName} {user.lastName}</p><Badge tone="brand" className="mt-1.5">{user.role}</Badge></div>
          </div>
          <dl className="grid sm:grid-cols-2">
            {rows.map((row, index) => <div key={row.label} className={`flex items-center gap-3 p-5 ${index < 2 ? 'border-b border-line' : ''} ${index % 2 === 0 ? 'sm:border-r sm:border-line' : ''}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-700"><row.icon className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{row.label}</dt><dd className="mt-1 truncate text-sm font-bold text-navy-900">{row.value}</dd></div></div>)}
          </dl>
        </section>

        <div className="mt-5 rounded-card border border-line bg-white p-5 text-sm leading-relaxed text-muted shadow-soft">
          Need to change your name, email or phone number? Contact <a href="mailto:support@ticketflow.co.ke" className="font-bold text-brand-700 underline">support@ticketflow.co.ke</a>. Account updates remain support-assisted until a verified profile-update endpoint is available.
        </div>
      </Container>
    </main>
  );
}

export default function AccountSettingsPage() {
  return <RequireRole roles={['CUSTOMER', 'ORGANIZER', 'ADMIN']}><AccountSettingsContent /></RequireRole>;
}
