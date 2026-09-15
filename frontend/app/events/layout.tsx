import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events Across Kenya',
  description: 'Browse concerts, festivals, conferences, theatre, sports and community events across Kenya.',
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
