'use client';

import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, FileCheck2, Landmark, LayoutDashboard, ShieldCheck, UserRoundCheck } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import RequireRole from '@/components/RequireRole';
import { api } from '@/lib/api';
import { OrganizerVerification } from '@/types';

export const VERIFICATION_NAV = [
  { label: 'Verification', href: '/organizer/verification', icon: ShieldCheck },
  { label: 'Company', href: '/organizer/verification/company', icon: Building2 },
  { label: 'Documents', href: '/organizer/verification/documents', icon: FileCheck2 },
  { label: 'Representative', href: '/organizer/verification/representative', icon: UserRoundCheck },
  { label: 'Payout', href: '/organizer/verification/payout', icon: Landmark },
  { label: 'Status', href: '/organizer/verification/status', icon: ShieldCheck },
  { label: 'Organizer dashboard', href: '/organizer/dashboard', icon: LayoutDashboard },
];

export function useOrganizerVerification() {
  return useQuery({
    queryKey: ['organizer-verification'],
    queryFn: async () => {
      const { data } = await api.get('/organizers/me/verification');
      return data as OrganizerVerification;
    },
  });
}

export function verificationLocked(status?: string) {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'VERIFIED';
}

export default function OrganizerVerificationShell({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={['ORGANIZER']}>
      <DashboardLayout items={VERIFICATION_NAV}>{children}</DashboardLayout>
    </RequireRole>
  );
}
