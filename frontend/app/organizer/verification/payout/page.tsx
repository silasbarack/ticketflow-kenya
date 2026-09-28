'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import OrganizerVerificationShell, { useOrganizerVerification, verificationLocked } from '@/components/OrganizerVerificationShell';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { Input, Label, Select } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

export default function PayoutVerificationPage(){
 const router=useRouter();const qc=useQueryClient();const query=useOrganizerVerification();
 const [form,setForm]=useState({payoutMethod:'BANK',payoutAccountName:'',payoutReference:'',payoutProofUrl:''});
 useEffect(()=>{if(query.data)setForm({payoutMethod:query.data.payoutMethod||'BANK',payoutAccountName:query.data.payoutAccountName||'',payoutReference:query.data.payoutReference||'',payoutProofUrl:query.data.payoutProofUrl||''});},[query.data]);
 const save=useMutation({mutationFn:async()=>api.patch('/organizers/me/verification/payout',form),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['organizer-verification']});toast.success('Payout details saved');router.push('/organizer/verification/status');},onError:e=>toast.error(getApiErrorMessage(e))});
 if(query.isLoading)return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card"/></OrganizerVerificationShell>;
 const locked=verificationLocked(query.data?.verificationStatus);
 return <OrganizerVerificationShell><PageHeader eyebrow="Verification · Step 4" title="Payout account" description="Confirm the account that should receive organizer settlements."/>
 <form onSubmit={e=>{e.preventDefault();save.mutate();}} className="mt-7 max-w-3xl rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
  <p className="mb-5 text-xs leading-5 text-muted">Use a business-owned account where possible. For bank accounts, use only a masked reference (for example, account ending 1234) during verification. Never enter a bank password, OTP, M-Pesa PIN or card PIN.</p>
  <div className="grid gap-4 sm:grid-cols-2">
   <div><Label htmlFor="method">Payout method</Label><Select id="method" disabled={locked} value={form.payoutMethod} onChange={e=>setForm({...form,payoutMethod:e.target.value})}><option value="BANK">Bank account</option><option value="MPESA_PAYBILL">M-Pesa Paybill</option><option value="MPESA_TILL">M-Pesa Till</option><option value="OTHER">Other approved method</option></Select></div>
   <div><Label htmlFor="account-name">Account / merchant name</Label><Input id="account-name" required disabled={locked} value={form.payoutAccountName} onChange={e=>setForm({...form,payoutAccountName:e.target.value})}/></div>
   <div className="sm:col-span-2"><Label htmlFor="reference">Masked bank account reference / Paybill / Till</Label><Input id="reference" required disabled={locked} value={form.payoutReference} onChange={e=>setForm({...form,payoutReference:e.target.value})}/></div>
   <div className="sm:col-span-2"><Label htmlFor="proof">Payout ownership proof URL</Label><Input id="proof" type="url" required disabled={locked} placeholder="https://..." value={form.payoutProofUrl} onChange={e=>setForm({...form,payoutProofUrl:e.target.value})}/></div>
  </div>
  {!locked&&<Button type="submit" className="mt-5" loading={save.isPending}>Save and review</Button>}
 </form></OrganizerVerificationShell>;
}
