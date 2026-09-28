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

export default function CompanyVerificationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const query = useOrganizerVerification();
  const [form, setForm] = useState({ legalBusinessName:'', registrationNumber:'', businessAddress:'', companyEmail:'', companyPhone:'' });

  useEffect(() => {
    if (!query.data) return;
    const v=query.data;
    setForm({ legalBusinessName:v.legalBusinessName||'', registrationNumber:v.registrationNumber||'', businessAddress:v.businessAddress||'', companyEmail:v.companyEmail||'', companyPhone:v.companyPhone||'' });
  }, [query.data]);

  const save=useMutation({
    mutationFn: async () => api.patch('/organizers/me/verification/company', form),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey:['organizer-verification'] }); toast.success('Company details saved'); router.push('/organizer/verification/documents'); },
    onError: e => toast.error(getApiErrorMessage(e)),
  });

  if(query.isLoading) return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card" /></OrganizerVerificationShell>;
  const locked=verificationLocked(query.data?.verificationStatus);
  return <OrganizerVerificationShell>
    <PageHeader eyebrow="Verification · Step 1" title="Company details" description="Enter the information exactly as it appears on the organization’s official records." />
    <form onSubmit={e=>{e.preventDefault();save.mutate();}} className="mt-7 max-w-3xl rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="legal-name">Legal business name</Label><Input id="legal-name" required disabled={locked} value={form.legalBusinessName} onChange={e=>setForm({...form,legalBusinessName:e.target.value})}/></div>
        <div><Label htmlFor="registration">Registration number</Label><Input id="registration" required disabled={locked} value={form.registrationNumber} onChange={e=>setForm({...form,registrationNumber:e.target.value})}/></div>
        <div><Label htmlFor="phone">Official phone</Label><Input id="phone" required disabled={locked} placeholder="07XXXXXXXX" value={form.companyPhone} onChange={e=>setForm({...form,companyPhone:e.target.value})}/></div>
        <div className="sm:col-span-2"><Label htmlFor="email">Official business email</Label><Input id="email" type="email" required disabled={locked} value={form.companyEmail} onChange={e=>setForm({...form,companyEmail:e.target.value})}/></div>
        <div className="sm:col-span-2"><Label htmlFor="address">Business address</Label><Input id="address" required disabled={locked} value={form.businessAddress} onChange={e=>setForm({...form,businessAddress:e.target.value})}/></div>
      </div>
      {!locked && <Button type="submit" className="mt-5" loading={save.isPending}>Save and continue</Button>}
      {locked && <p className="mt-5 text-sm text-muted">These details are locked while verification is under review or completed.</p>}
    </form>
  </OrganizerVerificationShell>;
}
