import { CheckCircle2, CreditCard, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';

export const ADMIN_NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Event Approvals', href: '/admin/events', icon: CheckCircle2 },
  { label: 'Organizer Verification', href: '/admin/organizers', icon: ShieldCheck },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
];
