interface LogoProps {
  /** "full" renders the ticket mark + wordmark; "icon" renders just the mark. */
  variant?: 'full' | 'icon';
  /** Use "dark" when placing the logo on a dark background (e.g. the footer). */
  theme?: 'light' | 'dark';
  className?: string;
  /** Unique id for the SVG gradient — pass a distinct value if rendering the logo more than once per page. */
  gradientId?: string;
}

function TicketMark({ gradientId }: { gradientId: string }) {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
      <rect x="9" y="15" width="30" height="18" rx="3" fill="white" />
      <circle cx="9" cy="24" r="3.5" fill={`url(#${gradientId})`} />
      <circle cx="39" cy="24" r="3.5" fill={`url(#${gradientId})`} />
      <line x1="30" y1="17.5" x2="30" y2="30.5" stroke="#fdba74" strokeWidth="1.4" strokeDasharray="2.2 2.2" strokeLinecap="round" />
      <path d="M32.2 24 L34.4 26.4 L37.6 21" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ variant = 'full', theme = 'light', className = 'h-9', gradientId = 'tfk-logo-grad' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <span className={className}>
        <TicketMark gradientId={gradientId} />
      </span>
    );
  }

  const wordmarkColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={className}>
        <TicketMark gradientId={gradientId} />
      </span>
      <span className={`text-lg font-bold leading-none ${wordmarkColor}`}>
        TicketFlow <span className="text-brand-600">Kenya</span>
      </span>
    </span>
  );
}
