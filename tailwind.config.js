/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Atelier / Kyron 2 Design System Tokens
        'bg-canvas': '#FFFFFF',
        'bg-surface': '#F8F8F7',
        'text-primary': '#171717',
        'text-secondary': '#737373',
        'text-tertiary': '#A3A3A3',
        'border-subtle': '#E8E8E6',
        'border-strong': '#D4D4D0',
        'primary-container': '#F97316',
        'on-primary': '#FFFFFF',
        'on-primary-container': '#582200',
        'accent-hover': '#EA580C',
        'accent-tint': '#FFF4EB',
        'status-success': '#15803D',
        'status-warning': '#B45309',
        'status-error': '#B91C1C',
        'outline-variant': '#E0C0B1',
        'surface-container-low': '#F3F4F3',
        'surface-container': '#EEEEED',
        'surface-container-high': '#E8E8E7',
        'surface-container-highest': '#E2E2E2',

        // Semantic Fallbacks
        background: '#FFFFFF',
        foreground: '#171717',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#171717',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#171717',
        },
        primary: {
          DEFAULT: '#F97316',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F8F8F7',
          foreground: '#171717',
        },
        muted: {
          DEFAULT: '#F8F8F7',
          foreground: '#737373',
        },
        accent: {
          DEFAULT: '#F97316',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#B91C1C',
          foreground: '#FFFFFF',
        },
        border: '#E8E8E6',
        input: '#E8E8E6',
        ring: '#F97316',
      },
      borderRadius: {
        DEFAULT: '0.25rem', // 4px
        sm: '0.125rem',     // 2px
        md: '0.375rem',     // 6px
        lg: '0.5rem',       // 8px
        xl: '0.75rem',      // 12px
        full: '9999px',
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        gutter: '1.5rem',
        'gutter-mobile': '1rem',
        margin: '3rem',
        'margin-mobile': '1.25rem',
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        headline: ['Geist', 'sans-serif'],
        code: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
