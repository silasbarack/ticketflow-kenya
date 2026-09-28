'use client';

import { useRouter } from 'next/navigation';
import OrganizerVerificationShell, { useOrganizerVerification, verificationLocked } from '@/components/OrganizerVerificationShell';
import VerificationDocumentUpload from '@/components/VerificationDocumentUpload';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { OrganizerVerificationDocumentKind } from '@/types';

const REQUIRED: Array<{ kind: OrganizerVerificationDocumentKind; label: string; hint: string }> = [
  {
    kind: 'INCORPORATION_CERTIFICATE',
    label: 'Certificate of incorporation / business registration',
    hint: 'Upload the original PDF where available, or a clear scan/photo showing the whole document.',
  },
  {
    kind: 'OFFICIAL_SEARCH',
    label: 'BRS Official Search / CR12',
    hint: 'Use a recent official search document for a limited company.',
  },
  {
    kind: 'KRA_PIN_CERTIFICATE',
    label: 'KRA PIN Certificate',
    hint: 'Upload the certificate only. Never provide your KRA password.',
  },
];

export default function VerificationDocumentsPage() {
  const router = useRouter();
  const query = useOrganizerVerification();

  if (query.isLoading) {
    return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card" /></OrganizerVerificationShell>;
  }

  const verification = query.data;
  const locked = verificationLocked(verification?.verificationStatus);
  const findDocument = (kind: OrganizerVerificationDocumentKind) =>
    verification?.documents?.find((document) => document.kind === kind);

  return (
    <OrganizerVerificationShell>
      <PageHeader
        eyebrow="Verification · Step 2"
        title="Business documents"
        description="Upload your official documents securely. PDF, JPG and PNG are accepted, up to 5 MB each."
      />

      <div className="mt-7 max-w-3xl space-y-4">
        <div className="rounded-card border border-brand-100 bg-brand-50/50 p-4 text-sm leading-6 text-navy-800">
          Digital PDFs from BRS/eCitizen/KRA are preferred. If you only have a paper copy, use <strong>Take photo</strong> on your phone. Make sure all text and document edges are clearly visible.
        </div>

        {REQUIRED.map((item) => (
          <VerificationDocumentUpload
            key={item.kind}
            {...item}
            document={findDocument(item.kind)}
            disabled={locked}
            onUploaded={() => query.refetch()}
          />
        ))}

        {locked && <p className="text-sm text-muted">Documents are locked while the application is under review or verified.</p>}

        <Button
          type="button"
          disabled={!verification?.steps.documents}
          onClick={() => router.push('/organizer/verification/representative')}
        >
          Continue to representative
        </Button>
      </div>
    </OrganizerVerificationShell>
  );
}
