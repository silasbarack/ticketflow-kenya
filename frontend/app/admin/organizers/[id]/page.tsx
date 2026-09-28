'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, CreditCard, ExternalLink, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';
import { AdminOrganizerVerification } from '@/types';

const NAV=[
 {label:'Overview',href:'/admin/dashboard',icon:LayoutDashboard},
 {label:'Event Approvals',href:'/admin/events',icon:CheckCircle2},
 {label:'Organizer Verification',href:'/admin/organizers',icon:ShieldCheck},
 {label:'Users',href:'/admin/users',icon:Users},
 {label:'Payments',href:'/admin/payments',icon:CreditCard},
];

function ReviewPage(){
 const {id}=useParams<{id:string}>(); const router=useRouter(); const qc=useQueryClient(); const [note,setNote]=useState('');
 const query=useQuery({queryKey:['admin-organizer-verification',id],queryFn:async()=>{const {data}=await api.get('/admin/organizer-verifications/'+id);return data as AdminOrganizerVerification;}});
 const action=useMutation({
  mutationFn:async(kind:'review'|'approve'|'changes'|'reject')=>{
   const path=kind==='review'?'under-review':kind==='approve'?'approve':kind==='changes'?'request-changes':'reject';
   return api.patch('/admin/organizer-verifications/'+id+'/'+path,{note});
  },
  onSuccess:async(_,kind)=>{await qc.invalidateQueries({queryKey:['admin-organizer-verification',id]});await qc.invalidateQueries({queryKey:['admin-organizer-verifications']});toast.success(kind==='approve'?'Organizer verified':kind==='review'?'Marked under review':kind==='changes'?'Changes requested':'Verification rejected');if(kind==='approve')router.push('/admin/organizers');},
  onError:e=>toast.error(getApiErrorMessage(e)),
 });
 if(query.isLoading)return <DashboardLayout items={NAV}><Skeleton className="h-96 rounded-card"/></DashboardLayout>;
 const v=query.data;
 if(!v)return <DashboardLayout items={NAV}><PageHeader eyebrow="KYB review" title="Organizer not found" description="This verification record is unavailable."/></DashboardLayout>;
 const evidence=[
  ['Certificate of incorporation / registration',v.certificateOfIncorporationUrl],
  ['BRS official search / CR12',v.officialSearchUrl],
  ['KRA PIN certificate',v.kraPinCertificateUrl],
  ['Representative ID / passport',v.representativeIdDocumentUrl],
  ['Authorization letter',v.authorizationLetterUrl],
  ['Payout ownership proof',v.payoutProofUrl],
 ].filter(([,url])=>Boolean(url));
 return <DashboardLayout items={NAV}>
  <PageHeader eyebrow="KYB review" title={v.companyName} description={v.user.firstName+' '+v.user.lastName+' · '+v.user.email}/>
  <div className="mt-7 grid gap-5 xl:grid-cols-2">
   <section className="rounded-card border border-line bg-white p-5 shadow-soft"><h2 className="section-title">Company</h2><dl className="mt-4 space-y-3 text-sm"><Row k="Legal name" v={v.legalBusinessName}/><Row k="Registration number" v={v.registrationNumber}/><Row k="Business address" v={v.businessAddress}/><Row k="Official email" v={v.companyEmail}/><Row k="Official phone" v={v.companyPhone}/></dl></section>
   <section className="rounded-card border border-line bg-white p-5 shadow-soft"><h2 className="section-title">Representative & payout</h2><dl className="mt-4 space-y-3 text-sm"><Row k="Representative" v={v.representativeFullName}/><Row k="Role" v={v.representativeRole}/><Row k="ID/passport ending" v={v.representativeIdLast4?('••••'+v.representativeIdLast4):null}/><Row k="Payout method" v={v.payoutMethod}/><Row k="Payout account name" v={v.payoutAccountName}/><Row k="Payout reference" v={v.payoutReference}/></dl></section>
  </div>
  <section className="mt-5 rounded-card border border-line bg-white p-5 shadow-soft"><h2 className="section-title">Evidence</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{evidence.map(([label,url])=><a key={label} href={url as string} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-btn border border-line p-3 text-sm font-semibold text-navy-800 hover:border-brand-300"><span>{label}</span><ExternalLink className="h-4 w-4 text-brand-600"/></a>)}</div></section>
  <section className="mt-5 rounded-card border border-line bg-white p-5 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="page-kicker">Decision</p><h2 className="section-title mt-1">{v.verificationStatus.replaceAll('_',' ')}</h2></div>{v.verificationSubmittedAt&&<p className="text-xs text-muted">Submitted {new Date(v.verificationSubmittedAt).toLocaleString('en-KE')}</p>}</div>
   <Textarea className="mt-4" rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Review note. Required when requesting changes or rejecting."/>
   <div className="mt-4 flex flex-wrap gap-2">
    {v.verificationStatus==='SUBMITTED'&&<Button variant="outline" onClick={()=>action.mutate('review')} loading={action.isPending}>Start review</Button>}
    {['SUBMITTED','UNDER_REVIEW'].includes(v.verificationStatus)&&<Button onClick={()=>action.mutate('approve')} loading={action.isPending}>Approve & verify</Button>}
    {['SUBMITTED','UNDER_REVIEW'].includes(v.verificationStatus)&&<Button variant="outline" onClick={()=>action.mutate('changes')} loading={action.isPending}>Request changes</Button>}
    {['SUBMITTED','UNDER_REVIEW'].includes(v.verificationStatus)&&<Button variant="danger" onClick={()=>action.mutate('reject')} loading={action.isPending}>Reject</Button>}
    <Link href="/admin/organizers" className="self-center text-sm font-bold text-brand-700">Back to verification queue</Link>
   </div>
  </section>
 </DashboardLayout>;
}
function Row({k,v}:{k:string;v?:string|null}){return <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-line pb-2 last:border-0"><dt className="text-muted">{k}</dt><dd className="font-semibold text-navy-900">{v||'—'}</dd></div>;}
export default function Page(){return <RequireRole roles={['ADMIN']}><ReviewPage/></RequireRole>;}
