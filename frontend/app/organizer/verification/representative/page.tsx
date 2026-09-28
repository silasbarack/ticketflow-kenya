'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import OrganizerVerificationShell, { useOrganizerVerification, verificationLocked } from '@/components/OrganizerVerificationShell';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { Input, Label } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

export default function RepresentativeVerificationPage(){
 const router=useRouter();const qc=useQueryClient();const query=useOrganizerVerification();
 const [form,setForm]=useState({representativeFullName:'',representativeRole:'',representativeIdLast4:'',representativeIdDocumentUrl:'',authorizationLetterUrl:''});
 useEffect(()=>{if(query.data)setForm({representativeFullName:query.data.representativeFullName||'',representativeRole:query.data.representativeRole||'',representativeIdLast4:query.data.representativeIdLast4||'',representativeIdDocumentUrl:query.data.representativeIdDocumentUrl||'',authorizationLetterUrl:query.data.authorizationLetterUrl||''});},[query.data]);
 const save=useMutation({mutationFn:async()=>api.patch('/organizers/me/verification/representative',{...form,authorizationLetterUrl:form.authorizationLetterUrl||undefined}),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['organizer-verification']});toast.success('Representative details saved');router.push('/organizer/verification/payout');},onError:e=>toast.error(getApiErrorMessage(e))});
 if(query.isLoading)return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card"/></OrganizerVerificationShell>;
 const locked=verificationLocked(query.data?.verificationStatus);
 return <OrganizerVerificationShell><PageHeader eyebrow="Verification · Step 3" title="Authorized representative" description="Identify the director or person authorized to act for this organization."/>
 <form onSubmit={e=>{e.preventDefault();save.mutate();}} className="mt-7 max-w-3xl rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
 <div className="grid gap-4 sm:grid-cols-2">
  <div><Label htmlFor="rep-name">Full name</Label><Input id="rep-name" required disabled={locked} value={form.representativeFullName} onChange={e=>setForm({...form,representativeFullName:e.target.value})}/></div>
  <div><Label htmlFor="rep-role">Role / title</Label><Input id="rep-role" required disabled={locked} placeholder="Director" value={form.representativeRole} onChange={e=>setForm({...form,representativeRole:e.target.value})}/></div>
  <div><Label htmlFor="rep-id">ID / passport last 4 characters</Label><Input id="rep-id" required minLength={2} maxLength={8} disabled={locked} value={form.representativeIdLast4} onChange={e=>setForm({...form,representativeIdLast4:e.target.value})}/></div>
  <div className="sm:col-span-2"><Label htmlFor="id-doc">ID / passport document URL</Label><Input id="id-doc" type="url" required disabled={locked} placeholder="https://..." value={form.representativeIdDocumentUrl} onChange={e=>setForm({...form,representativeIdDocumentUrl:e.target.value})}/></div>
  <div className="sm:col-span-2"><Label htmlFor="auth-letter">Authorization letter URL (if representative is not a listed director)</Label><Input id="auth-letter" type="url" disabled={locked} placeholder="https://..." value={form.authorizationLetterUrl} onChange={e=>setForm({...form,authorizationLetterUrl:e.target.value})}/></div>
 </div>
 {!locked&&<Button type="submit" className="mt-5" loading={save.isPending}>Save and continue</Button>}
 </form></OrganizerVerificationShell>;
}
