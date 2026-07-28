'use client';

import { Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Container from '@/components/ui/Container';
import Badge from '@/components/ui/Badge';

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-4 last:border-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="truncate text-sm font-semibold text-navy-900">{value}</p>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <Container className="py-16 text-center text-muted">
        <p>Loading account...</p>
      </Container>
    );
  }

  return (
    <Container className="max-w-2xl py-10">
      <h1 className="text-2xl font-bold text-navy-900">Account Settings</h1>
      <p className="mt-1 text-sm text-muted">Your account details as registered with TicketFlow Kenya.</p>

      <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-lg font-bold text-white">
            {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-bold text-navy-900">
              {user.firstName} {user.lastName}
            </p>
            <Badge tone="brand">{user.role}</Badge>
          </div>
        </div>

        <div className="mt-6">
          <Row icon={<Mail className="h-4 w-4" aria-hidden="true" />} label="Email" value={user.email} />
          <Row icon={<Phone className="h-4 w-4" aria-hidden="true" />} label="Phone" value={user.phone || 'Not set'} />
          <Row icon={<UserIcon className="h-4 w-4" aria-hidden="true" />} label="Account type" value={user.role} />
          <Row
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            label="Status"
            value={user.isActive ? 'Active' : 'Suspended'}
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        Need to change your name, email, or phone number? Contact{' '}
        <a href="mailto:support@ticketflow.co.ke" className="font-medium text-brand-700 underline">
          support@ticketflow.co.ke
        </a>
        .
      </p>
    </Container>
  );
}
