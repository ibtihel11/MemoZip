const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('background'),
        surface: c('surface'),
        surface2: c('surface-raised'),
        'border-strong': c('border-strong'),
        fg: c('text'),
        muted: c('muted'),
        subtle: c('subtle'),
        accent: c('primary'),
        'accent-solid': c('primary-solid'),
        'on-accent': c('on-primary'),
        'accent-text': c('primary-text'),
        mint: c('mastery'),
        'mint-text': c('mastery-text'),
        warn: c('warning'),
        'warn-text': c('warning-text'),
      },
      // Corner radius follows the active theme (--radius-scale); pills stay round.
      borderRadius: {
        md: 'calc(0.375rem * var(--radius-scale))',
        lg: 'calc(0.5rem * var(--radius-scale))',
        xl: 'calc(0.75rem * var(--radius-scale))',
        '2xl': 'calc(1rem * var(--radius-scale))',
        '3xl': 'calc(1.5rem * var(--radius-scale))',
      },
      borderColor: { DEFAULT: c('border'), border: c('border') },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'page-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { from: { opacity: '0', transform: 'translateY(6px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'question-in': { from: { opacity: '0', transform: 'translateX(14px)' }, to: { opacity: '1', transform: 'none' } },
        'soft-pulse': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'page-in': 'page-in 260ms ease-out both',
        pop: 'pop 180ms ease-out both',
        'question-in': 'question-in 240ms ease-out both',
        'soft-pulse': 'soft-pulse 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
