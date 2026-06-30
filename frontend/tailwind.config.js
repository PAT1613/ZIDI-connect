/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        soft: '0 2px 6px -1px rgb(15 23 42 / 0.06), 0 4px 16px -4px rgb(15 23 42 / 0.06)',
        glow: '0 0 0 4px rgb(14 116 144 / 0.12)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0e7490 0%, #155e75 60%, #083344 100%)',
        'auth-mesh':
          'radial-gradient(at 20% 20%, rgba(14,116,144,0.15) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(245,158,11,0.10) 0px, transparent 50%), radial-gradient(at 50% 0%, rgba(8,51,68,0.05) 0px, transparent 50%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(14 116 144 / 0.35)' },
          '70%': { boxShadow: '0 0 0 8px rgb(14 116 144 / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(14 116 144 / 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
