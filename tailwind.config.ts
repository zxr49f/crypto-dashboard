import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          950: '#08090c',
          900: '#0d0f14',
          850: '#12151c',
          800: '#181c25',
          700: '#232833',
          600: '#323847',
          500: '#4a5164',
          400: '#6b7280',
          300: '#9199a8',
          200: '#c2c7d1',
          100: '#e8eaee',
        },
        brass: {
          400: '#f4c95d',
          500: '#e8b23f',
          600: '#c9922a',
          700: '#a8761f',
        },
        emerald: {
          400: '#3ddc97',
          500: '#22c07f',
          600: '#189567',
        },
        garnet: {
          400: '#f3746e',
          500: '#e5433b',
          600: '#c22e28',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'ui-serif', 'serif'],
        body: ['var(--font-plex-sans)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(232,178,63,0.15), 0 8px 30px -8px rgba(232,178,63,0.12)',
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        noise: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.16,1,0.3,1) both',
        pulseDot: 'pulseDot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
