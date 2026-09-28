'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { AdminOrganizerVerification, OrganizerVerificationStatus } from '@/types';

const NAV=[
 {label:'Overview',href:'/admin/dashboard',icon:LayoutDashboard},
 {label:'Event Approvals',href:'/admin/events',icon:CheckCircle2},
 {label:'Organizer Verification',href:'/admin/organizers',icon:ShieldCheck},
 {label:'Users',href:'/admin/users',icon:Users},
 {label:'Payments',href:'/admin/payments',icon:CreditCard},
];
const FILTERS=['SUBMITTED','UNDER_REVIEW','CHANGES_REQUIRED','VERIFIED','REJECTED','IN_PROGRESS','NOT_STARTED'] as OrganizerVerificationStatus[];

function AdminOrganizerVerifications(){
 const [status,setStatus]=useState<OrganizerVerificationStatus>('SUBMITTED');
 const query=useQuery({queryKey:['admin-organizer-verifications',status],queryFn:async()=>{const {data}=await api.get('/admin/organizer-verifications',{params:{status}});return data as AdminOrganizerVerification[];}});
 return <DashboardLayout items={NAV}>
  <PageHeader eyebrow="KYB review" title="Organizer verification" description="Review the legal identity, representative and payout evidence supplied by event organizers."/>
  <div className="mt-6 max-w-xs"><Select value={status} onChange={e=>setStatus(e.target.value as OrganizerVerificationStatus)}>{FILTERS.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</Select></div>
  <section className="mt-5">
   {query.isLoading?<Skeleton className="h-64 rounded-card"/>:!query.data?.length?<EmptyState title="No organizers in this status" description="Change the status filter to review other applications."/>:
   <div className="table-shell overflow-x-auto"><table className="data-table min-w-[760px]"><thead><tr><th>Organizer</th><th>Contact</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>
    {query.data.map(v=><tr key={v.id}><td><p className="font-bold text-navy-900">{v.companyName}</p><p className="text-xs text-muted">{v.user.firstName} {v.user.lastName}</p></td><td><p>{v.user.email}</p><p className="text-xs text-muted">{v.user.phone||'—'}</p></td><td className="font-semibold">{v.verificationStatus.replaceAll('_',' ')}</td><td>{v.verificationSubmittedAt?new Date(v.verificationSubmittedAt).toLocaleDateString('en-KE'):'—'}</td><td className="text-right"><Link href={'/admin/organizers/'+v.id} className="font-bold text-brand-700 hover:underline">Review</Link></td></tr>)}
   </tbody></table></div>}
  </section>
 </DashboardLayout>;
}
export default function Page(){return <RequireRole roles={['ADMIN']}><AdminOrganizerVerifications/></RequireRole>;}
