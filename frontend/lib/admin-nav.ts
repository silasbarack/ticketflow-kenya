import { Bot, CheckCircle2, CreditCard, LayoutDashboard, LifeBuoy, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';

export const ADMIN_NAV = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Event Approvals', href: '/admin/events', icon: CheckCircle2 },
  { label: 'Organizer Verification', href: '/admin/organizers', icon: ShieldCheck },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'AI Operations', href: '/admin/ai-operations', icon: Bot },
  { label: 'Support', href: '/admin/support', icon: LifeBuoy },
  { label: 'AI Settings', href: '/admin/ai-settings', icon: SlidersHorizontal },
];
