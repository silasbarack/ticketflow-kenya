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
          50: '#f1f5f9',
          100: '#e2e9f0',
          200: '#c7d3e0',
          300: '#9db0c6',
          400: '#6c84a3',
          500: '#48607f',
          600: '#354a66',
          700: '#263650',
          800: '#18253a',
          900: '#0e1b2a',
          950: '#080f18',
        },
        cream: '#f7f6f2',
        surface: '#eef4f1',
        muted: '#667085',
        line: '#e4e7ec',
      },
      fontFamily: {
        sans: ['var(--font-noto-sans)', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        btn: '10px',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(14,27,42,0.04), 0 1px 3px 0 rgba(14,27,42,0.06)',
        card: '0 2px 8px -2px rgba(14,27,42,0.08), 0 4px 16px -4px rgba(14,27,42,0.06)',
        elevated: '0 12px 32px -8px rgba(14,27,42,0.18)',
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
