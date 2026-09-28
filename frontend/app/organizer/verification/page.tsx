'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, LockKeyhole, ShieldCheck } from 'lucide-react';
import OrganizerVerificationShell, { useOrganizerVerification } from '@/components/OrganizerVerificationShell';
import PageHeader from '@/components/ui/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import { buttonVariants } from '@/components/ui/Button';

const STEPS = [
  { key: 'company', title: 'Company details', text: 'Registered business name, registration number and official contacts.', href: '/organizer/verification/company' },
  { key: 'documents', title: 'Business documents', text: 'Certificate of incorporation/registration, official search and KRA PIN certificate.', href: '/organizer/verification/documents' },
  { key: 'representative', title: 'Authorized representative', text: 'Confirm the director or person authorized to act for the company.', href: '/organizer/verification/representative' },
  { key: 'payout', title: 'Payout account', text: 'Verify where TicketFlow should settle event proceeds.', href: '/organizer/verification/payout' },
] as const;

export default function OrganizerVerificationPage() {
  const query = useOrganizerVerification();
  const verification = query.data;

  return (
    <OrganizerVerificationShell>
      <PageHeader eyebrow="Organizer KYB" title="Verify your organization" description="Complete these checks before a paid event can be submitted for publication." />
      {query.isLoading ? <Skeleton className="mt-7 h-72 rounded-card" /> : (
        <>
          {verification?.verificationReviewNote && (
            <div className="mt-6 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Review note:</strong> {verification.verificationReviewNote}
            </div>
          )}
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {STEPS.map((step, index) => {
              const complete = Boolean(verification?.steps[step.key]);
              return (
                <Link key={step.key} href={step.href} className="rounded-card border border-line bg-white p-5 shadow-soft transition hover:border-brand-300">
                  <div className="flex items-start gap-3">
                    {complete ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <Circle className="mt-0.5 h-5 w-5 text-muted" />}
                    <div><p className="text-xs font-extrabold uppercase tracking-wider text-muted">Step {index + 1}</p><h2 className="mt-1 text-base font-extrabold text-navy-900">{step.title}</h2><p className="mt-1 text-sm leading-6 text-muted">{step.text}</p></div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-6 rounded-card bg-ink-950 p-5 text-white shadow-card">
            <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-brand-300" /><div><h2 className="font-extrabold">Protect your credentials</h2><p className="mt-1 text-sm leading-6 text-white/65">TicketFlow will never ask for your eCitizen password, KRA password, online-banking password, OTP, M-Pesa PIN or card PIN.</p></div></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/organizer/verification/status" className={buttonVariants()}><ShieldCheck className="h-4 w-4" />View verification status</Link>
            {verification?.isVerified && <Link href="/organizer/events/create" className={buttonVariants({ variant: 'outline' })}>Create an event</Link>}
          </div>
        </>
      )}
    </OrganizerVerificationShell>
  );
}
