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

export default function VerificationDocumentsPage() {
  const router=useRouter(); const qc=useQueryClient(); const query=useOrganizerVerification();
  const [form,setForm]=useState({certificateOfIncorporationUrl:'',officialSearchUrl:'',kraPinCertificateUrl:''});
  useEffect(()=>{if(query.data)setForm({certificateOfIncorporationUrl:query.data.certificateOfIncorporationUrl||'',officialSearchUrl:query.data.officialSearchUrl||'',kraPinCertificateUrl:query.data.kraPinCertificateUrl||''});},[query.data]);
  const save=useMutation({mutationFn:async()=>api.patch('/organizers/me/verification/documents',form),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['organizer-verification']});toast.success('Verification documents saved');router.push('/organizer/verification/representative');},onError:e=>toast.error(getApiErrorMessage(e))});
  if(query.isLoading)return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card"/></OrganizerVerificationShell>;
  const locked=verificationLocked(query.data?.verificationStatus);
  return <OrganizerVerificationShell>
    <PageHeader eyebrow="Verification · Step 2" title="Business documents" description="Provide secure links to the documents TicketFlow needs to review."/>
    <form onSubmit={e=>{e.preventDefault();save.mutate();}} className="mt-7 max-w-3xl rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
      <p className="mb-5 rounded-btn bg-navy-50 p-3 text-xs leading-5 text-muted">Use HTTPS links from storage you control. Do not place passwords, OTPs or PINs in filenames, URLs or notes. Native private-file uploads can be added once a protected document-storage provider is configured.</p>
      <div className="space-y-4">
        <div><Label htmlFor="incorporation">Certificate of incorporation / registration URL</Label><Input id="incorporation" type="url" required disabled={locked} placeholder="https://..." value={form.certificateOfIncorporationUrl} onChange={e=>setForm({...form,certificateOfIncorporationUrl:e.target.value})}/></div>
        <div><Label htmlFor="search">BRS official search / CR12 URL</Label><Input id="search" type="url" required disabled={locked} placeholder="https://..." value={form.officialSearchUrl} onChange={e=>setForm({...form,officialSearchUrl:e.target.value})}/></div>
        <div><Label htmlFor="kra">KRA PIN certificate URL</Label><Input id="kra" type="url" required disabled={locked} placeholder="https://..." value={form.kraPinCertificateUrl} onChange={e=>setForm({...form,kraPinCertificateUrl:e.target.value})}/></div>
      </div>
      {!locked&&<Button type="submit" className="mt-5" loading={save.isPending}>Save and continue</Button>}
    </form>
  </OrganizerVerificationShell>;
}
