/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        heading: 'rgb(var(--c-heading) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        accent2: 'rgb(var(--c-accent2) / <alpha-value>)',
        onaccent: 'rgb(var(--c-on-accent) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Newsreader', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { wrap: '1200px' },
      boxShadow: {
        /* Editorial layouts get depth from hairlines, not shadows. These
           remain only for popovers that must float above the page. */
        card: '0 1px 0 0 rgb(var(--c-line) / 0.9)',
        lift: '0 24px 48px -32px rgb(0 0 0 / 0.55)',
      },
      borderRadius: {
        /* Square by default; only deliberate marks round off. */
        DEFAULT: '0px',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.4,0,0.2,1) both',
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
};
