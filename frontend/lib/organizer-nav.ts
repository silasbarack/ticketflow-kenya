import { BarChart3, LayoutDashboard, Megaphone, PlusCircle, ScanLine, ShieldCheck } from 'lucide-react';

/** Organizer workspace navigation — shared so every organizer page lists the same tools. */
export const ORGANIZER_NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Sales Insights', href: '/organizer/insights', icon: BarChart3 },
  { label: 'Marketing Studio', href: '/organizer/marketing', icon: Megaphone },
  { label: 'Verification', href: '/organizer/verification', icon: ShieldCheck },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];
