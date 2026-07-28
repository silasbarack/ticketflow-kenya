import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary action colour — emerald green (#087F5B)
        brand: {
          50: '#ecfbf6',
          100: '#d2f5e9',
          200: '#a6ebd3',
          300: '#6fdbb9',
          400: '#3ec59d',
          500: '#16a883',
          600: '#087f5b',
          700: '#066b4c',
          800: '#06553e',
          900: '#054433',
          950: '#022a20',
        },
        // Secondary accent — warm coral (#F25F4C)
        accent: {
          50: '#fff3f1',
          100: '#ffe1dc',
          200: '#ffc5ba',
          300: '#ffa290',
          400: '#fa8065',
          500: '#f25f4c',
          600: '#dc432f',
          700: '#b93321',
          800: '#8f2a1c',
          900: '#74271b',
          950: '#3e110b',
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
