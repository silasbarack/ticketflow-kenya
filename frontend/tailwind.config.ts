import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Kenya flag red — primary brand colour
        brand: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        // Kenya flag green — accent colour
        accent: {
          600: '#16a34a',
          700: '#15803d',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto-sans)', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
