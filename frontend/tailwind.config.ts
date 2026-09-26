import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary action colour — TicketFlow red (#E31845), matching the real logo
        brand: {
          50: '#fff1f4',
          100: '#ffe2e8',
          200: '#ffc6d2',
          300: '#ff97aa',
          400: '#ff5874',
          500: '#f92348',
          600: '#e6002d',
          700: '#bd0025',
          800: '#9f0625',
          900: '#870925',
          950: '#4b0010',
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
        cream: '#f7f7f9',
        surface: '#f2f3f6',
        muted: '#6c6f78',
        line: '#e5e7eb',
      },
      fontFamily: {
        // Noto Sans for body copy; Poppins for headings (h1–h3 in globals.css); Caveat for the brand's handwritten accents.
        sans: ['var(--font-noto-sans)', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-noto-sans)', 'Arial', 'sans-serif'],
        script: ['var(--font-script)', 'cursive'],
      },
      borderRadius: {
        // Inputs/selects. Buttons opt into a full pill via `rounded-full`.
        btn: '12px',
        card: '18px',
        panel: '24px',
      },
      boxShadow: {
        soft: '0 4px 16px -10px rgba(15,23,42,0.18), 0 1px 3px rgba(15,23,42,0.06)',
        card: '0 16px 40px -26px rgba(15,23,42,0.28), 0 2px 6px rgba(15,23,42,0.05)',
        elevated: '0 30px 80px -30px rgba(15,23,42,0.38)',
        // Primary CTA halo — brand red at low alpha, never used to carry meaning.
        glow: '0 16px 34px -18px rgba(230,0,45,0.72)',
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
