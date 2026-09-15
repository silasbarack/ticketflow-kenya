'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { ArrowLeft, CalendarDays, Download, MapPin, Printer, QrCode, ShieldCheck, Ticket as TicketIcon, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import Logo from '@/components/Logo';
import StatusBadge from '@/components/StatusBadge';
import Button, { buttonVariants } from '@/components/ui/Button';
import Container from '@/components/ui/Container';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { Ticket } from '@/types';
import { formatCurrency, formatDateTime, formatTicketCategory } from '@/lib/format';

function ETicketContent() {
  const params = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/tickets/${params.id}`);
      return data as Ticket;
    },
  });

  if (isLoading) return <Container className="max-w-2xl py-10"><Skeleton className="h-[680px] rounded-panel" /></Container>;
  if (isError || !ticket) return <Container className="max-w-2xl py-16"><EmptyState icon={<TicketIcon className="h-6 w-6" aria-hidden="true" />} title="Ticket unavailable" description="We couldn't load this ticket. Return to My Tickets and try again." action={<Link href="/dashboard/tickets" className={buttonVariants()}>My tickets</Link>} /></Container>;

  return (
    <main className="bg-cream py-6 sm:py-10 print:bg-white print:py-0">
      <Container className="max-w-2xl">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden" data-print-hidden="true">
          <Link href="/dashboard/tickets" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-navy-700 hover:text-brand-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My tickets</Link>
          <p className="hidden text-xs text-muted sm:block">Increase screen brightness for faster scanning</p>
        </div>

        <article className="overflow-hidden rounded-panel border border-line bg-white shadow-elevated print:rounded-none print:border-0 print:shadow-none">
          <header className="border-b border-brand-100 bg-brand-50 px-5 py-5 text-navy-900 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="page-kicker">TicketFlow Kenya e-ticket</p>
                <h1 className="mt-2 text-xl font-extrabold leading-tight sm:text-2xl">{ticket.order.event.title}</h1>
              </div>
              <Logo variant="icon" className="h-10 shrink-0" />
            </div>
          </header>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2"><StatusBadge status={ticket.status} /><span className="text-xs text-muted">Present at the entrance</span></div>
              <div className="mt-5 w-full max-w-[308px] rounded-card border-2 border-navy-900 bg-white p-3 shadow-soft">
                <Image src={ticket.qrCodeData} alt={`QR code for ticket ${ticket.ticketCode}`} width={280} height={280} priority unoptimized className="h-auto w-full" />
              </div>
              <p className="tnum mt-4 font-mono text-sm font-bold tracking-[0.08em] text-navy-900">{ticket.ticketCode}</p>
              <p className="mt-1 text-xs text-muted">Keep the code unobstructed. Each ticket can be admitted once.</p>
            </div>

            <div className="relative my-7 border-t border-dashed border-line" aria-hidden="true"><span className="absolute -left-10 -top-3 h-6 w-6 rounded-full border border-line bg-cream" /><span className="absolute -right-10 -top-3 h-6 w-6 rounded-full border border-line bg-cream" /></div>

            <dl className="grid gap-5 sm:grid-cols-2">
              <TicketDetail icon={CalendarDays} label="Date and time" value={formatDateTime(ticket.order.event.startDateTime)} />
              <TicketDetail icon={MapPin} label="Venue" value={`${ticket.order.event.venue}, ${ticket.order.event.city}`} />
              <TicketDetail icon={TicketIcon} label="Ticket type" value={`${ticket.ticketType.name} · ${formatTicketCategory(ticket.ticketType.category)}`} />
              <TicketDetail icon={UserRound} label="Ticket holder" value={ticket.attendeeName || 'Primary account holder'} />
              <TicketDetail icon={ShieldCheck} label="Booking reference" value={ticket.order.orderNumber} mono />
              <TicketDetail icon={QrCode} label="Ticket value" value={formatCurrency(ticket.ticketType.price)} />
              {ticket.checkIn && <TicketDetail icon={ShieldCheck} label="Checked in" value={formatDateTime(ticket.checkIn.checkedInAt)} />}
            </dl>
          </div>

          <footer className="border-t border-line bg-cream/70 px-5 py-4 text-center text-xs leading-relaxed text-muted sm:px-8">
            This ticket is linked to its unique identifier. Do not share the QR code publicly.
          </footer>
        </article>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 print:hidden" data-print-hidden="true">
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticket.id}/pdf`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ fullWidth: true })}><Download className="h-4 w-4" aria-hidden="true" />Download PDF</a>
          <Button variant="outline" fullWidth onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" />Print ticket</Button>
        </div>
      </Container>
    </main>
  );
}

function TicketDetail({ icon: Icon, label, value, mono }: { icon: typeof CalendarDays; label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-700"><Icon className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt><dd className={`mt-1 text-sm font-bold leading-relaxed text-navy-900 ${mono ? 'font-mono' : ''}`}>{value}</dd></div></div>;
}

export default function ETicketPage() {
  return <RequireRole roles={['CUSTOMER', 'ORGANIZER', 'ADMIN']}><ETicketContent /></RequireRole>;
}
