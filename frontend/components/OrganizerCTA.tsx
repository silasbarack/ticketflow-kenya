'use client';
import Link from 'next/link';
import { ArrowUpRight, CalendarPlus, QrCode, Wallet } from 'lucide-react';
import Container from '@/components/ui/Container';
import { buttonVariants } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
export default function OrganizerCTA() {
  const { user } = useAuth();
  return <section id="for-organizers" className="scroll-mt-24 bg-brand-600 py-10 text-white sm:py-12"><Container className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">For the people who bring us together</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Your event. A full house.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85">Create your event, sell tickets with M-Pesa, and welcome your guests with a quick QR scan.</p><Link href={user?.role === 'ORGANIZER' ? '/organizer/events/create' : '/register'} className={buttonVariants({ variant:'outline', className:'mt-6 border-white text-brand-700' })}>Start organizing <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div><div className="grid gap-4">{[{icon:CalendarPlus,title:'Publish your event',text:'Set up your page and ticket options.'},{icon:Wallet,title:'Keep track of sales',text:'View your orders and revenue in one place.'},{icon:QrCode,title:'Make entry simple',text:'Check in guests with their QR tickets.'}].map(({icon:Icon,title,text}) => <div key={title} className="flex items-center gap-4 border-b border-white/25 pb-4 last:border-0"><Icon className="h-6 w-6 shrink-0" aria-hidden="true" /><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs text-white/80">{text}</p></div></div>)}</div></Container></section>;
}
