'use client';
import Link from 'next/link';
import { ArrowUpRight, CalendarPlus, QrCode, Wallet } from 'lucide-react';
import Container from '@/components/ui/Container';
import { buttonVariants } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function OrganizerCTA() {
  const { user } = useAuth();
  const items = [
    {icon:CalendarPlus,title:'Publish your event',text:'Create a polished event page and configure ticket tiers.'},
    {icon:Wallet,title:'Track your sales',text:'See orders, ticket performance and revenue in one workspace.'},
    {icon:QrCode,title:'Scan tickets fast',text:'Validate signed QR tickets at the entrance from your phone.'},
  ];

  return (
    <section id="for-organizers" className="scroll-mt-24 bg-navy-950 py-12 text-white sm:py-16">
      <Container className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-300">For event organizers</p>
          <h2 className="mt-4 max-w-xl text-3xl font-black tracking-[-0.04em] sm:text-5xl">Your event deserves a smoother ticketing experience.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">Create, sell and scan from one platform built for Kenyan events and mobile-first customers.</p>
          <Link href={user?.role === 'ORGANIZER' ? '/organizer/events/create' : '/register'} className={buttonVariants({ size:'lg', className:'mt-7 rounded-full' })}>
            Start organizing <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-3">
          {items.map(({icon:Icon,title,text}, index) => (
            <div key={title} className="group flex gap-4 rounded-card border border-white/10 bg-white/[0.055] p-5 transition hover:border-brand-400/40 hover:bg-white/[0.08]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-glow"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/40">0{index + 1}</p><h3 className="mt-1 text-base font-extrabold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-white/60">{text}</p></div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
