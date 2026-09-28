'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock3, ShieldAlert, ShieldCheck } from 'lucide-react';
import OrganizerVerificationShell, { useOrganizerVerification } from '@/components/OrganizerVerificationShell';
import PageHeader from '@/components/ui/PageHeader';
import Button, { buttonVariants } from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { api, getApiErrorMessage } from '@/lib/api';

const COPY: Record<string,{title:string;text:string}> = {
 NOT_STARTED:{title:'Verification not started',text:'Complete the four verification sections before submitting.'},
 IN_PROGRESS:{title:'Verification in progress',text:'Finish all sections, then submit the application for TicketFlow review.'},
 SUBMITTED:{title:'Submitted',text:'Your verification has been received and is waiting for review.'},
 UNDER_REVIEW:{title:'Under review',text:'TicketFlow is reviewing the organization and payout information you supplied.'},
 CHANGES_REQUIRED:{title:'Changes required',text:'Review the note below, update the affected section and submit again.'},
 VERIFIED:{title:'Verified organizer',text:'Your organization is verified and may submit paid events for publication.'},
 REJECTED:{title:'Verification rejected',text:'Review the decision note below. You may correct the information and submit a new application.'},
};

export default function VerificationStatusPage(){
 const query=useOrganizerVerification();const qc=useQueryClient();const v=query.data;
 const submit=useMutation({mutationFn:async()=>api.post('/organizers/me/verification/submit'),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['organizer-verification']});toast.success('Verification submitted for review');},onError:e=>toast.error(getApiErrorMessage(e))});
 if(query.isLoading)return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card"/></OrganizerVerificationShell>;
 if(!v)return <OrganizerVerificationShell><PageHeader eyebrow="Organizer KYB" title="Verification unavailable" description="The verification record could not be loaded."/></OrganizerVerificationShell>;
 const copy=COPY[v.verificationStatus]||COPY.NOT_STARTED;
 const Icon=v.verificationStatus==='VERIFIED'?CheckCircle2:v.verificationStatus==='SUBMITTED'||v.verificationStatus==='UNDER_REVIEW'?Clock3:v.verificationStatus==='CHANGES_REQUIRED'||v.verificationStatus==='REJECTED'?ShieldAlert:ShieldCheck;
 const editable=['NOT_STARTED','IN_PROGRESS','CHANGES_REQUIRED','REJECTED'].includes(v.verificationStatus);
 return <OrganizerVerificationShell>
  <PageHeader eyebrow="Organizer KYB" title="Verification status" description="Track whether your company is cleared to submit paid events."/>
  <section className="mt-7 max-w-3xl rounded-card border border-line bg-white p-6 shadow-soft">
   <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon className="h-6 w-6"/></span><div><p className="text-xs font-extrabold uppercase tracking-wider text-muted">{v.verificationStatus.replaceAll('_',' ')}</p><h2 className="mt-1 text-xl font-extrabold text-navy-900">{copy.title}</h2><p className="mt-2 text-sm leading-6 text-muted">{copy.text}</p></div></div>
   {v.verificationReviewNote&&<div className="mt-5 rounded-btn bg-amber-50 p-4 text-sm text-amber-900"><strong>TicketFlow review note:</strong> {v.verificationReviewNote}</div>}
   <div className="mt-6 grid gap-2 sm:grid-cols-2">
    {Object.entries(v.steps).map(([key,complete])=><div key={key} className="flex items-center gap-2 rounded-btn border border-line px-3 py-2 text-sm"><CheckCircle2 className={complete?'h-4 w-4 text-emerald-600':'h-4 w-4 text-gray-300'}/><span className="capitalize">{key}</span></div>)}
   </div>
   <div className="mt-6 flex flex-wrap gap-3">
    {editable&&v.canSubmit&&<Button onClick={()=>submit.mutate()} loading={submit.isPending}>Submit for review</Button>}
    {editable&&!v.canSubmit&&<Link href="/organizer/verification" className={buttonVariants()}>Complete verification</Link>}
    {v.isVerified&&<Link href="/organizer/events/create" className={buttonVariants()}>Create an event</Link>}
    <Link href="/organizer/dashboard" className={buttonVariants({variant:'outline'})}>Organizer dashboard</Link>
   </div>
  </section>
 </OrganizerVerificationShell>;
}
