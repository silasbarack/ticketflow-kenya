'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import OrganizerVerificationShell, { useOrganizerVerification, verificationLocked } from '@/components/OrganizerVerificationShell';
import LinkedInStyleIdentityCapture from '@/components/LinkedInStyleIdentityCapture';
import PersonaIdentityVerification from '@/components/PersonaIdentityVerification';
import VerificationDocumentUpload from '@/components/VerificationDocumentUpload';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { Input, Label } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

type DocumentType = 'NATIONAL_ID' | 'DRIVERS_LICENSE';

export default function RepresentativeVerificationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const query = useOrganizerVerification();
  const [form, setForm] = useState({
    representativeFullName: '',
    representativeRole: '',
    representativeDocumentType: null as DocumentType | null,
  });

  useEffect(() => {
    if (!query.data) return;
    setForm({
      representativeFullName: query.data.representativeFullName || '',
      representativeRole: query.data.representativeRole || '',
      representativeDocumentType: query.data.representativeDocumentType || null,
    });
  }, [query.data]);

  async function saveRepresentative(documentType?: DocumentType) {
    if (!form.representativeFullName.trim() || !form.representativeRole.trim()) {
      throw new Error('Enter the representative full name and role before starting identity verification.');
    }
    await api.patch('/organizers/me/verification/representative', {
      representativeFullName: form.representativeFullName.trim(),
      representativeRole: form.representativeRole.trim(),
      ...(documentType ? { representativeDocumentType: documentType } : {}),
    });
    if (documentType) {
      setForm((current) => ({ ...current, representativeDocumentType: documentType }));
    }
    await qc.invalidateQueries({ queryKey: ['organizer-verification'] });
  }

  async function persistDetails(documentType: DocumentType) {
    return saveRepresentative(documentType);
  }

  const save = useMutation({
    mutationFn: async () => saveRepresentative(form.representativeDocumentType || undefined),
    onSuccess: () => toast.success('Representative details saved'),
    onError: (error) => toast.error(error instanceof Error ? error.message : getApiErrorMessage(error)),
  });

  if (query.isLoading) {
    return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card" /></OrganizerVerificationShell>;
  }

  const verification = query.data;
  const locked = verificationLocked(verification?.verificationStatus);
  const authorizationLetter = verification?.documents?.find((document) => document.kind === 'AUTHORIZATION_LETTER');

  return (
    <OrganizerVerificationShell>
      <PageHeader
        eyebrow="Verification · Step 3"
        title="Authorized representative"
        description="Confirm the person acting for the organization with a guided selfie and government-issued identity document."
      />

      <div className="mt-7 max-w-3xl space-y-4">
        <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rep-name">Full name</Label>
              <Input
                id="rep-name"
                required
                disabled={locked}
                value={form.representativeFullName}
                onChange={(event) => setForm({ ...form, representativeFullName: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rep-role">Role / title</Label>
              <Input
                id="rep-role"
                required
                disabled={locked}
                placeholder="Director"
                value={form.representativeRole}
                onChange={(event) => setForm({ ...form, representativeRole: event.target.value })}
              />
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            Your full ID number is not requested in this form. The identity document is captured separately in the protected camera flow below.
          </p>
          {!locked && (
            <Button type="submit" className="mt-5" loading={save.isPending}>Save representative details</Button>
          )}
        </form>

        <PersonaIdentityVerification
          verified={verification?.representativeIdentityVerified}
          status={verification?.personaInquiryStatus}
          disabled={locked}
          onBeforeStart={() => saveRepresentative(form.representativeDocumentType || undefined)}
          onUpdated={() => query.refetch()}
        />

        {!verification?.representativeIdentityVerified && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
              <span className="h-px flex-1 bg-line" />
              Manual capture fallback
              <span className="h-px flex-1 bg-line" />
            </div>
            <LinkedInStyleIdentityCapture
              documents={verification?.documents || []}
              disabled={locked}
              initialDocumentType={verification?.representativeDocumentType || null}
              onPersistDetails={persistDetails}
              onUpdated={() => query.refetch()}
            />
          </div>
        )}

        <VerificationDocumentUpload
          kind="AUTHORIZATION_LETTER"
          label="Authorization letter (optional)"
          hint="Upload this only when the representative is not clearly authorized by the company records."
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
