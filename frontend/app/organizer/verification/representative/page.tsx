'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import OrganizerVerificationShell, { useOrganizerVerification, verificationLocked } from '@/components/OrganizerVerificationShell';
import VerificationDocumentUpload from '@/components/VerificationDocumentUpload';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { Input, Label } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

export default function RepresentativeVerificationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const query = useOrganizerVerification();
  const [form, setForm] = useState({ representativeFullName: '', representativeRole: '', representativeIdLast4: '' });

  useEffect(() => {
    if (!query.data) return;
    setForm({
      representativeFullName: query.data.representativeFullName || '',
      representativeRole: query.data.representativeRole || '',
      representativeIdLast4: query.data.representativeIdLast4 || '',
    });
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => api.patch('/organizers/me/verification/representative', form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['organizer-verification'] });
      toast.success('Representative details saved');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (query.isLoading) {
    return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card" /></OrganizerVerificationShell>;
  }

  const verification = query.data;
  const locked = verificationLocked(verification?.verificationStatus);
  const idDocument = verification?.documents?.find((document) => document.kind === 'REPRESENTATIVE_ID');
  const authorizationLetter = verification?.documents?.find((document) => document.kind === 'AUTHORIZATION_LETTER');

  return (
    <OrganizerVerificationShell>
      <PageHeader
        eyebrow="Verification · Step 3"
        title="Authorized representative"
        description="Identify the director or person authorized to act for this organization."
      />

      <div className="mt-7 max-w-3xl space-y-4">
        <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rep-name">Full name</Label>
              <Input id="rep-name" required disabled={locked} value={form.representativeFullName} onChange={(e) => setForm({ ...form, representativeFullName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="rep-role">Role / title</Label>
              <Input id="rep-role" required disabled={locked} placeholder="Director" value={form.representativeRole} onChange={(e) => setForm({ ...form, representativeRole: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="rep-id">ID / passport last 4 characters</Label>
              <Input id="rep-id" required minLength={2} maxLength={8} disabled={locked} value={form.representativeIdLast4} onChange={(e) => setForm({ ...form, representativeIdLast4: e.target.value })} />
              <p className="mt-1 text-xs text-muted">TicketFlow stores only the characters you enter here for display matching; the full document is kept separately as a protected upload.</p>
            </div>
          </div>
          {!locked && <Button type="submit" className="mt-5" loading={save.isPending}>Save representative details</Button>}
        </form>

        <VerificationDocumentUpload
          kind="REPRESENTATIVE_ID"
          label="National ID or passport"
          hint="Upload a clear scan/photo. On mobile, use Take photo for a camera capture."
          document={idDocument}
          disabled={locked}
          onUploaded={() => query.refetch()}
        />

        <VerificationDocumentUpload
          kind="AUTHORIZATION_LETTER"
          label="Authorization letter (optional)"
          hint="Required when the person submitting the application is not clearly authorized by the company records."
          document={authorizationLetter}
          disabled={locked}
          onUploaded={() => query.refetch()}
        />

        <Button
          type="button"
          disabled={!verification?.steps.representative}
          onClick={() => router.push('/organizer/verification/payout')}
        >
          Continue to payout
        </Button>
      </div>
    </OrganizerVerificationShell>
  );
}
