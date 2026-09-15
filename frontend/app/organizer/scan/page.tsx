'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Ban, Camera, CheckCircle2, Keyboard, LayoutDashboard, PlusCircle, RotateCcw, ScanLine, ShieldX, UserCheck } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import DashboardLayout from '@/components/DashboardLayout';
import QrScanner from '@/components/QrScanner';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { Input, Label, Select } from '@/components/ui/Input';
import { EventItem } from '@/types';

const NAV = [
  { label: 'Overview', href: '/organizer/dashboard', icon: LayoutDashboard },
  { label: 'Create Event', href: '/organizer/events/create', icon: PlusCircle },
  { label: 'Scan Tickets', href: '/organizer/scan', icon: ScanLine },
];

type ScanStatus = 'VALID' | 'USED' | 'INVALID' | 'CANCELLED' | 'REFUNDED' | 'PAYMENT_NOT_CONFIRMED';
interface VerifyResult {
  status: ScanStatus;
  message: string;
  ticket?: { ticketCode: string; eventTitle: string; eventVenue?: string; eventDateTime?: string; holderName: string; holderEmail?: string; ticketType: string; category: string; paymentStatus?: string; status?: string; scannedAt?: string };
}
interface CheckInResult { ticket: { ticketCode: string; status: string } }

const STATUS_STYLES = {
  VALID: { icon: CheckCircle2, surface: 'border-emerald-300 bg-emerald-50', iconStyle: 'bg-emerald-600 text-white', text: 'text-emerald-950', label: 'Valid ticket' },
  USED: { icon: AlertTriangle, surface: 'border-amber-300 bg-amber-50', iconStyle: 'bg-amber-500 text-white', text: 'text-amber-950', label: 'Already used' },
  INVALID: { icon: ShieldX, surface: 'border-danger-300 bg-danger-50', iconStyle: 'bg-danger-600 text-white', text: 'text-danger-950', label: 'Invalid ticket' },
  CANCELLED: { icon: Ban, surface: 'border-danger-300 bg-danger-50', iconStyle: 'bg-danger-600 text-white', text: 'text-danger-950', label: 'Cancelled ticket' },
  REFUNDED: { icon: RotateCcw, surface: 'border-danger-300 bg-danger-50', iconStyle: 'bg-danger-600 text-white', text: 'text-danger-950', label: 'Refunded ticket' },
  PAYMENT_NOT_CONFIRMED: { icon: ShieldX, surface: 'border-danger-300 bg-danger-50', iconStyle: 'bg-danger-600 text-white', text: 'text-danger-950', label: 'Payment not confirmed' },
} satisfies Record<ScanStatus, { icon: typeof CheckCircle2; surface: string; iconStyle: string; text: string; label: string }>;

function ScanContent() {
  const [eventId, setEventId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [pendingQrData, setPendingQrData] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  const eventsQuery = useQuery({
    queryKey: ['organizer-events-scan'],
    queryFn: async () => {
      const { data } = await api.get('/events/organizer/mine');
      return (data as EventItem[]).filter((event) => event.status === 'PUBLISHED');
    },
  });
  const selectedEvent = eventsQuery.data?.find((event) => event.id === eventId);

  const verifyMutation = useMutation({
    mutationFn: async (ticketCode: string) => {
      const { data } = await api.get<VerifyResult>(`/tickets/verify/${ticketCode}`);
      return data;
    },
    onSuccess: setVerifyResult,
    onError: (error) => setVerifyResult({ status: 'INVALID', message: getApiErrorMessage(error) }),
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ qrData, ticketCode }: { qrData?: string; ticketCode?: string }) => {
      if (qrData) return (await api.post<CheckInResult>('/checkins/scan', { qrData, eventId })).data;
      return (await api.post<CheckInResult>('/checkins/manual', { ticketCode, eventId })).data;
    },
    onSuccess: (data) => {
      toast.success(`Checked in ${data.ticket.ticketCode}`);
      setSessionCount((count) => count + 1);
      reset();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function handleQrScan(text: string) {
    setScanning(false);
    let ticketCode = text;
    try { const parsed = JSON.parse(text); ticketCode = parsed.code ?? text; } catch { /* QR may contain a plain code */ }
    setPendingQrData(text);
    verifyMutation.mutate(ticketCode);
  }

  function reset() {
    setVerifyResult(null);
    setPendingQrData(null);
    setManualCode('');
    setScanning(false);
  }

  const statusStyle = verifyResult ? STATUS_STYLES[verifyResult.status] : null;

  return (
    <DashboardLayout items={NAV}>
      <PageHeader eyebrow="Gate operations" title="Ticket scanner" description="Choose the live event first. Every scan is verified before entry is committed." actions={<div className="rounded-full border border-line bg-white px-4 py-2 text-sm shadow-soft"><span className="text-muted">This session</span><strong className="tnum ml-2 text-navy-900">{sessionCount}</strong></div>} />

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
          <Label htmlFor="scan-event">Event to check into</Label>
          <Select id="scan-event" value={eventId} onChange={(event) => { setEventId(event.target.value); reset(); }} disabled={eventsQuery.isLoading}>
            <option value="">Select a published event</option>
            {eventsQuery.data?.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
          </Select>

          {!eventsQuery.isLoading && !eventsQuery.data?.length && <EmptyState className="mt-5" title="No published events" description="Publish an event before opening the gate scanner." />}

          {eventId && !verifyResult && (
            <div className="mt-6 space-y-5">
              <div className="overflow-hidden rounded-card border border-line bg-ink-950 p-4 text-white sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="page-kicker text-brand-300">Camera</p><h2 className="mt-1 text-base font-bold">Place the QR code in frame</h2></div>
                  <Button size="sm" variant={scanning ? 'outline' : 'primary'} className={scanning ? 'border-white/25 bg-white/10 text-white hover:bg-white/15' : ''} onClick={() => setScanning((current) => !current)}><Camera className="h-4 w-4" aria-hidden="true" />{scanning ? 'Stop' : 'Start camera'}</Button>
                </div>
                <div className="mt-4 overflow-hidden rounded-btn bg-white"><QrScanner active={scanning} onScan={handleQrScan} /></div>
                {verifyMutation.isPending && <p className="mt-3 text-sm text-white/60" role="status">Verifying ticket…</p>}
              </div>

              <div className="rounded-card border border-line bg-cream/55 p-4 sm:p-5">
                <div className="flex items-center gap-2"><Keyboard className="h-4 w-4 text-brand-600" aria-hidden="true" /><h2 className="text-sm font-bold text-navy-900">Manual lookup</h2></div>
                <form onSubmit={(event) => { event.preventDefault(); setPendingQrData(null); verifyMutation.mutate(manualCode.trim()); }} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                  <Input required value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="TFK-XXXXXXXXXX" className="font-mono uppercase" />
                  <Button type="submit" disabled={verifyMutation.isPending}>Verify ticket</Button>
                </form>
              </div>
            </div>
          )}

          {verifyResult && statusStyle && (
            <div className={`mt-6 rounded-card border-2 p-5 sm:p-6 ${statusStyle.surface}`} role="status" aria-live="assertive">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${statusStyle.iconStyle}`}><statusStyle.icon className="h-8 w-8" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-extrabold uppercase tracking-eyebrow ${statusStyle.text}`}>{statusStyle.label}</p>
                  <p className={`mt-1 text-lg font-extrabold ${statusStyle.text}`}>{verifyResult.message}</p>
                  {verifyResult.ticket && <dl className={`mt-4 grid gap-x-5 gap-y-3 border-t border-current/15 pt-4 text-sm sm:grid-cols-2 ${statusStyle.text}`}>
                    <ResultRow label="Ticket code" value={verifyResult.ticket.ticketCode} mono />
                    <ResultRow label="Holder" value={verifyResult.ticket.holderName} />
                    <ResultRow label="Event" value={verifyResult.ticket.eventTitle} />
                    <ResultRow label="Ticket type" value={`${verifyResult.ticket.ticketType} (${verifyResult.ticket.category})`} />
                    {verifyResult.ticket.scannedAt && <ResultRow label="Previous scan" value={new Date(verifyResult.ticket.scannedAt).toLocaleString('en-KE')} />}
                  </dl>}
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {verifyResult.status === 'VALID' && <Button onClick={() => checkInMutation.mutate(pendingQrData ? { qrData: pendingQrData } : { ticketCode: manualCode.trim() })} loading={checkInMutation.isPending} className="bg-emerald-700 shadow-none hover:bg-emerald-800"><UserCheck className="h-4 w-4" aria-hidden="true" />Confirm entry</Button>}
                    <Button variant="outline" onClick={reset}>Scan another</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-card border border-line bg-white p-5 shadow-soft xl:sticky xl:top-[calc(var(--header-height)+1.5rem)]">
          <p className="page-kicker">Active gate</p>
          <h2 className="section-title mt-2">{selectedEvent?.title ?? 'No event selected'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{selectedEvent ? `${selectedEvent.venue}, ${selectedEvent.city}` : 'Select the exact event before scanning. A valid ticket for a different event must not be admitted.'}</p>
          <div className="mt-5 space-y-3 border-t border-line pt-5 text-xs text-muted">
            <p><strong className="text-navy-800">Green:</strong> verify details, then confirm entry.</p>
            <p><strong className="text-navy-800">Amber:</strong> ticket was already used.</p>
            <p><strong className="text-navy-800">Red:</strong> do not admit; resolve with the ticket desk.</p>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}

function ResultRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-xs opacity-65">{label}</dt><dd className={`mt-0.5 font-bold ${mono ? 'font-mono' : ''}`}>{value}</dd></div>;
}

export default function ScanPage() {
  return <RequireRole roles={['ORGANIZER']}><ScanContent /></RequireRole>;
}
