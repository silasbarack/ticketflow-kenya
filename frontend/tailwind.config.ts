import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary action colour — TicketFlow red (#E31845), matching the real logo
        brand: {
          50: '#fff0f4',
          100: '#ffe0e8',
          200: '#ffbecd',
          300: '#ff90ab',
          400: '#fa5c85',
          500: '#ef2f5f',
          600: '#e31845',
          700: '#b90f33',
          800: '#8f0c29',
          900: '#6b0a1f',
          950: '#3d0611',
        },
        // Warning / urgency accent — amber-orange (reversible states only: sold out, low stock, pending)
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Destructive-action colour — dark brick red, deliberately distinct from brand red
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Primary dark colour — deep navy (#0E1B2A). Also used for headings/body text.
        navy: {
          50: '#f7f7f6',
          100: '#ececea',
          200: '#d9d8d4',
          300: '#b8b6b0',
          400: '#8d8a83',
          500: '#68655f',
          600: '#4e4b46',
          700: '#393733',
          800: '#282724',
          900: '#191918',
          950: '#0d0d0c',
        },
        /*
         * Ink — the near-black ground for the immersive marketing/booking
         * surfaces introduced in the 2026 refresh. Cooler and deeper than
         * navy so a navy card still separates when it sits on top of it.
         */
        ink: {
          700: '#242321',
          800: '#1a1918',
          900: '#111110',
          950: '#090908',
        },
        cream: '#f8f7f4',
        surface: '#f1f0ec',
        muted: '#6f6b64',
        line: '#e3e1dc',
      },
      fontFamily: {
        // Single family across the product — headings, body copy and figures.
        // Hierarchy comes from weight, size and tracking, never from a second face.
        sans: ['var(--font-noto-sans)', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        // Inputs/selects. Buttons opt into a full pill via `rounded-full`.
        btn: '8px',
        card: '12px',
        panel: '16px',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(8,13,19,0.04), 0 1px 3px 0 rgba(8,13,19,0.05)',
        card: '0 1px 2px rgba(17,17,16,0.04), 0 12px 32px -24px rgba(17,17,16,0.32)',
        elevated: '0 28px 70px -32px rgba(17,17,16,0.42)',
        // Primary CTA halo — brand red at low alpha, never used to carry meaning.
        glow: '0 10px 28px -14px rgba(227,24,69,0.65)',
      },
      maxWidth: {
        container: '1280px',
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      keyframes: {
        'ember-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(0,-18px,0) scale(1.06)' },
        },
      },
      animation: {
        'ember-drift': 'ember-drift 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
