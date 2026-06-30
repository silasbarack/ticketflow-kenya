'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import QrScanner from '@/components/QrScanner';
import { EventItem } from '@/types';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: '\u{1F4CA}' },
  { label: 'Create Event', href: '/organizer/events/create', icon: '➕' },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: '\u{1F4F1}' },
];

type ScanStatus = 'VALID' | 'USED' | 'INVALID' | 'CANCELLED' | 'REFUNDED' | 'PAYMENT_NOT_CONFIRMED';

interface VerifyResult {
  status: ScanStatus;
  message: string;
  ticket?: {
    ticketCode: string;
    eventTitle: string;
    eventVenue?: string;
    eventDateTime?: string;
    holderName: string;
    holderEmail?: string;
    ticketType: string;
    category: string;
    paymentStatus?: string;
    status?: string;
    scannedAt?: string;
  };
}

interface CheckInResult {
  ticket: { ticketCode: string; status: string };
}

const STATUS_STYLES: Record<ScanStatus, { bg: string; border: string; text: string; icon: string }> = {
  VALID:                  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', icon: '✅' },
  USED:                   { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-800',   icon: '⚠️' },
  INVALID:                { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800',     icon: '❌' },
  CANCELLED:              { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800',     icon: '🚫' },
  REFUNDED:               { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800',     icon: '↩️' },
  PAYMENT_NOT_CONFIRMED:  { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800',     icon: '💳' },
};

function ScanContent() {
  const [eventId, setEventId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [pendingQrData, setPendingQrData] = useState<string | null>(null);

  const { data: events } = useQuery({
    queryKey: ['organizer-events-scan'],
    queryFn: async () => {
      const { data } = await api.get('/events/organizer/mine');
      return (data as EventItem[]).filter((e) => e.status === 'PUBLISHED');
    },
  });

  // Read-only verify — shows ticket info without committing check-in
  const verifyMutation = useMutation({
    mutationFn: async (ticketCode: string) => {
      const { data } = await api.get<VerifyResult>(`/tickets/verify/${ticketCode}`);
      return data;
    },
    onSuccess: (data) => {
      setVerifyResult(data);
    },
    onError: (error) => {
      setVerifyResult({ status: 'INVALID', message: getApiErrorMessage(error) });
    },
  });

  // Commit check-in (only after verify shows VALID)
  const checkInMutation = useMutation({
    mutationFn: async ({ qrData, ticketCode }: { qrData?: string; ticketCode?: string }) => {
      if (qrData) {
        const { data } = await api.post<CheckInResult>('/checkins/scan', { qrData, eventId });
        return data;
      }
      const { data } = await api.post<CheckInResult>('/checkins/manual', { ticketCode, eventId });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`✅ Checked in: ${data.ticket.ticketCode}`);
      setVerifyResult(null);
      setPendingQrData(null);
      setManualCode('');
      setScanning(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const handleQrScan = (text: string) => {
    setScanning(false);
    // Extract ticket code from QR payload
    let ticketCode = text;
    try {
      const parsed = JSON.parse(text);
      ticketCode = parsed.code ?? text;
    } catch {
      /* plain text code */
    }
    setPendingQrData(text);
    verifyMutation.mutate(ticketCode);
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setPendingQrData(null);
    verifyMutation.mutate(manualCode.trim());
  };

  const commitCheckIn = () => {
    if (pendingQrData) {
      checkInMutation.mutate({ qrData: pendingQrData });
    } else {
      checkInMutation.mutate({ ticketCode: manualCode.trim() });
    }
  };

  const reset = () => {
    setVerifyResult(null);
    setPendingQrData(null);
    setManualCode('');
  };

  const style = verifyResult ? STATUS_STYLES[verifyResult.status] : null;

  return (
    <DashboardLayout items={NAV}>
      <h1 className="text-2xl font-bold text-gray-900">Scan Tickets</h1>
      <p className="mt-1 text-gray-500">
        Select an event, then scan a QR code or enter a ticket code manually.
        A preview shows ticket info before you confirm entry.
      </p>

      <div className="mt-6 max-w-xl space-y-6">
        {/* Event selector */}
        <div>
          <label className="text-sm font-medium text-gray-700">Event</label>
          <select
            value={eventId}
            onChange={(e) => { setEventId(e.target.value); reset(); setScanning(false); }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select a published event</option>
            {events?.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>

        {eventId && !verifyResult && (
          <>
            {/* Camera scanner */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Camera Scanner</h2>
                <button
                  onClick={() => setScanning((s) => !s)}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {scanning ? 'Stop camera' : 'Start camera'}
                </button>
              </div>
              <div className="mt-3">
                <QrScanner active={scanning} onScan={handleQrScan} />
              </div>
              {verifyMutation.isPending && (
                <p className="mt-2 text-sm text-gray-500 animate-pulse">Verifying ticket…</p>
              )}
            </div>

            {/* Manual entry */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold text-gray-900">Manual Check-in</h2>
              <form onSubmit={handleManualVerify} className="mt-3 flex gap-2">
                <input
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="TFK-XXXXXXXXXX"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                />
                <button
                  type="submit"
                  disabled={verifyMutation.isPending}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  Verify
                </button>
              </form>
            </div>
          </>
        )}

        {/* Verification result panel */}
        {verifyResult && style && (
          <div className={`rounded-2xl border ${style.border} ${style.bg} p-5`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{style.icon}</span>
              <div className="flex-1">
                <p className={`font-bold text-base ${style.text}`}>
                  {verifyResult.message}
                </p>

                {verifyResult.ticket && (
                  <div className={`mt-3 space-y-1.5 text-sm ${style.text}`}>
                    <InfoRow label="Ticket Code" value={verifyResult.ticket.ticketCode} mono />
                    <InfoRow label="Event" value={verifyResult.ticket.eventTitle} />
                    <InfoRow label="Holder" value={verifyResult.ticket.holderName} />
                    {verifyResult.ticket.holderEmail && (
                      <InfoRow label="Email" value={verifyResult.ticket.holderEmail} />
                    )}
                    <InfoRow
                      label="Ticket Type"
                      value={`${verifyResult.ticket.ticketType} (${verifyResult.ticket.category})`}
                    />
                    {verifyResult.ticket.paymentStatus && (
                      <InfoRow label="Payment" value={verifyResult.ticket.paymentStatus} />
                    )}
                    {verifyResult.ticket.scannedAt && (
                      <InfoRow
                        label="Scanned At"
                        value={new Date(verifyResult.ticket.scannedAt).toLocaleString('en-KE')}
                      />
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {verifyResult.status === 'VALID' && (
                    <button
                      onClick={commitCheckIn}
                      disabled={checkInMutation.isPending || !eventId}
                      className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {checkInMutation.isPending ? 'Checking in…' : '✅ Confirm Entry'}
                    </button>
                  )}
                  <button
                    onClick={reset}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
                  >
                    Scan another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="opacity-70 w-28 shrink-0">{label}:</span>
      <span className={`font-semibold ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function ScanPage() {
  return (
    <RequireRole roles={['ORGANIZER']}>
      <ScanContent />
    </RequireRole>
  );
}
