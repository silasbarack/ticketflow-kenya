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

interface CheckInResult {
  ticket: { ticketCode: string; status: string };
}

function ScanContent() {
  const [eventId, setEventId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: events } = useQuery({
    queryKey: ['organizer-events-scan'],
    queryFn: async () => {
      const { data } = await api.get('/events/organizer/mine');
      return (data as EventItem[]).filter((e) => e.status === 'PUBLISHED');
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const { data } = await api.post<CheckInResult>('/checkins/scan', { qrData, eventId });
      return data;
    },
    onSuccess: (data) => {
      setLastResult({ success: true, message: `Checked in: ${data.ticket.ticketCode}` });
      toast.success('Ticket checked in');
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      setLastResult({ success: false, message });
      toast.error(message);
    },
  });

  const manualMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CheckInResult>('/checkins/manual', { ticketCode: manualCode, eventId });
      return data;
    },
    onSuccess: (data) => {
      setLastResult({ success: true, message: `Checked in: ${data.ticket.ticketCode}` });
      toast.success('Ticket checked in');
      setManualCode('');
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      setLastResult({ success: false, message });
      toast.error(message);
    },
  });

  return (
    <DashboardLayout items={NAV}>
      <h1 className="text-2xl font-bold text-gray-900">Scan Tickets</h1>
      <p className="mt-1 text-gray-500">Select an event, then scan a ticket QR code or enter its code manually.</p>

      <div className="mt-6 max-w-xl space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700">Event</label>
          <select
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              setScanning(false);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select a published event</option>
            {events?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        {eventId && (
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
              <QrScanner active={scanning} onScan={(text) => scanMutation.mutate(text)} />
            </div>
          </div>
        )}

        {eventId && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Manual Check-in</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                manualMutation.mutate();
              }}
              className="mt-3 flex gap-2"
            >
              <input
                required
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="TFK-XXXXXXXXXX"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              />
              <button
                type="submit"
                disabled={manualMutation.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Validate
              </button>
            </form>
          </div>
        )}

        {lastResult && (
          <div
            className={`rounded-xl p-4 text-sm font-medium ${
              lastResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {lastResult.message}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ScanPage() {
  return (
    <RequireRole roles={['ORGANIZER']}>
      <ScanContent />
    </RequireRole>
  );
}
