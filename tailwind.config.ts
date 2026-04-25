import type { Config } from 'tailwindcss';

export default {
  content: [
    'index.html',
    'src/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary (design-language §2.1)
        primary: {
          DEFAULT: '#2F6FED',
          soft: '#D9E5FB',
          strong: '#1A4FBF',
        },
        // Accents (design-language §2.2)
        accent: {
          a: '#FFB400',
          b: '#7B2CBF',
          c: '#0FA968',
        },
        // Semantic (design-language §2.3)
        success: {
          DEFAULT: '#1FAA59',
          soft: '#D6F1E0',
        },
        error: {
          DEFAULT: '#E5484D',
          soft: '#FBE3E4',
        },
        warning: '#F2A93B',
        // Neutrals (design-language §2.4)
        neutral: {
          0: '#FFFFFF',
          50: '#F7F8FA',
          100: '#EEF0F4',
          300: '#C5CAD3',
          600: '#5B6478',
          900: '#101521',
        },
      },
      fontFamily: {
        // design-language §3.1 — Nunito with system fallbacks
        sans: ['"Nunito"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // design-language §3.3 — fluid sizes anchored at 360px
        'xs': ['13px', { lineHeight: '1.5' }],
        'sm': ['14px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.5' }],
        'lg': ['20px', { lineHeight: '1.5' }],
        'xl': ['24px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        '2xl': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display': ['48px', { lineHeight: '1.0', letterSpacing: '0' }],
      },
      screens: {
        // design-language §8 responsive breakpoints
        'xs': '360px',
        'sm': '480px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
      // design-language §5 — touch target minimums
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      // design-language §6.3 — single easing curve
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'snap': '200ms',
        'feedback': '180ms',
        'partition': '500ms',
        'return': '350ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
