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
import { Input, Label, Select } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

export default function PayoutVerificationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const query = useOrganizerVerification();
  const [form, setForm] = useState({ payoutMethod: 'BANK', payoutAccountName: '', payoutReference: '' });

  useEffect(() => {
    if (!query.data) return;
    setForm({
      payoutMethod: query.data.payoutMethod || 'BANK',
      payoutAccountName: query.data.payoutAccountName || '',
      payoutReference: query.data.payoutReference || '',
    });
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => api.patch('/organizers/me/verification/payout', form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['organizer-verification'] });
      toast.success('Payout details saved');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (query.isLoading) {
    return <OrganizerVerificationShell><Skeleton className="h-72 rounded-card" /></OrganizerVerificationShell>;
  }

  const verification = query.data;
  const locked = verificationLocked(verification?.verificationStatus);
  const payoutProof = verification?.documents?.find((document) => document.kind === 'PAYOUT_PROOF');

  return (
    <OrganizerVerificationShell>
      <PageHeader eyebrow="Verification · Step 4" title="Payout account" description="Confirm the account that should receive organizer settlements." />

      <div className="mt-7 max-w-3xl space-y-4">
        <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <p className="mb-5 text-xs leading-5 text-muted">
            Use a business-owned account where possible. For bank accounts, enter only a masked reference such as <strong>account ending 1234</strong>. Never enter a bank password, OTP, M-Pesa PIN or card PIN.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="method">Payout method</Label>
              <Select id="method" disabled={locked} value={form.payoutMethod} onChange={(e) => setForm({ ...form, payoutMethod: e.target.value })}>
                <option value="BANK">Bank account</option>
                <option value="MPESA_PAYBILL">M-Pesa Paybill</option>
                <option value="MPESA_TILL">M-Pesa Till</option>
                <option value="OTHER">Other approved method</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="account-name">Account / merchant name</Label>
              <Input id="account-name" required disabled={locked} value={form.payoutAccountName} onChange={(e) => setForm({ ...form, payoutAccountName: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="reference">Masked bank account reference / Paybill / Till</Label>
              <Input id="reference" required disabled={locked} value={form.payoutReference} onChange={(e) => setForm({ ...form, payoutReference: e.target.value })} />
            </div>
          </div>
          {!locked && <Button type="submit" className="mt-5" loading={save.isPending}>Save payout details</Button>}
        </form>

        <VerificationDocumentUpload
          kind="PAYOUT_PROOF"
          label="Proof of payout-account ownership"
          hint="Upload a bank letter, statement header, merchant document or other proof showing the account/merchant name. Redact transaction history and unnecessary balances where possible."
          document={payoutProof}
          disabled={locked}
          onUploaded={() => query.refetch()}
        />

        <Button
          type="button"
          disabled={!verification?.steps.payout}
          onClick={() => router.push('/organizer/verification/status')}
        >
          Continue to review
        </Button>
      </div>
    </OrganizerVerificationShell>
  );
}
