/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // Custom color system with CSS variables
      colors: {
        // Primary colors
        primary: {
          50: 'var(--color-primary-50, #eff6ff)',
          100: 'var(--color-primary-100, #dbeafe)',
          200: 'var(--color-primary-200, #bfdbfe)',
          300: 'var(--color-primary-300, #93c5fd)',
          400: 'var(--color-primary-400, #60a5fa)',
          500: 'var(--color-primary-500, #3b82f6)',
          600: 'var(--color-primary-600, #2563eb)',
          700: 'var(--color-primary-700, #1d4ed8)',
          800: 'var(--color-primary-800, #1e40af)',
          900: 'var(--color-primary-900, #1e3a8a)',
          950: 'var(--color-primary-950, #172554)',
          DEFAULT: 'var(--color-primary-500, #3b82f6)',
        },
        // Background colors
        background: {
          main: 'var(--color-background-main, #ffffff)',
          paper: 'var(--color-background-paper, #f8fafc)',
          default: 'var(--color-background-default, #ffffff)',
          DEFAULT: 'var(--color-background-default, #ffffff)',
        },
        // Surface colors
        surface: {
          main: 'var(--color-surface-main, #ffffff)',
          variant: 'var(--color-surface-variant, #f1f5f9)',
          DEFAULT: 'var(--color-surface-main, #ffffff)',
        },
        // Text colors
        foreground: 'var(--color-text-primary, #0f172a)',
        'text-primary': 'var(--color-text-primary, #0f172a)',
        'text-secondary': 'var(--color-text-secondary, #475569)',
        'text-disabled': 'var(--color-text-disabled, #94a3b8)',
        'text-inverse': 'var(--color-text-inverse, #ffffff)',
        // Border colors
        border: {
          main: 'var(--color-border-main, #e2e8f0)',
          light: 'var(--color-border-light, #f1f5f9)',
          dark: 'var(--color-border-dark, #cbd5e1)',
          DEFAULT: 'var(--color-border-main, #e2e8f0)',
        },
        // Legacy restaurant colors for backward compatibility
        blueDark: '#101C2C',
        blueBase: '#162346',
        bluePri: '#1E3A8A',
        accent: '#3B82F6',
        slate400: '#94a3b8',
        slate600: '#475569',
        slate700: '#334155',
        // Semantic colors
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
          DEFAULT: '#10b981',
        },
        error: {
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
          DEFAULT: '#ef4444',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
          DEFAULT: '#f59e0b',
        },
        info: {
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
          DEFAULT: '#06b6d4',
        },
        // Muted colors
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        // Additional UI colors
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        ring: 'hsl(var(--ring))',
      },
      // Enhanced spacing scale
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
        '144': '36rem',   // 576px
      },
      // Enhanced font sizes
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      // Enhanced shadows
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 50px -10px rgba(0, 0, 0, 0.04)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      // Enhanced border radius
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      // Enhanced z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      // Enhanced screen sizes
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
      // Animation enhancements
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-out': 'slide-out 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-out': 'scale-out 0.2s ease-out',
      },
      // Enhanced typography
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'serif': ['ui-serif', 'Georgia', 'serif'],
        'mono': ['ui-monospace', 'Monaco', 'monospace'],
      },
      // Enhanced line heights
      lineHeight: {
        '12': '3rem',
        '16': '4rem',
      },
      // Enhanced max width scale
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      // Enhanced min height scale
      minHeight: {
        '12': '3rem',
        '16': '4rem',
        'screen-75': '75vh',
        'screen-80': '80vh',
        'screen-90': '90vh',
      },
      // Enhanced backdrop blur
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // Use class-based form styling
    }),
    // Custom plugin for theme variables
    function({ addBase, theme }) {
      addBase({
        ':root': {
          '--color-primary-50': theme('colors.blue.50'),
          '--color-primary-100': theme('colors.blue.100'),
          '--color-primary-200': theme('colors.blue.200'),
          '--color-primary-300': theme('colors.blue.300'),
          '--color-primary-400': theme('colors.blue.400'),
          '--color-primary-500': theme('colors.blue.500'),
          '--color-primary-600': theme('colors.blue.600'),
          '--color-primary-700': theme('colors.blue.700'),
          '--color-primary-800': theme('colors.blue.800'),
          '--color-primary-900': theme('colors.blue.900'),
          '--color-primary-950': theme('colors.blue.950'),
          '--color-background-main': '#ffffff',
          '--color-background-paper': '#f8fafc',
          '--color-background-default': '#ffffff',
          '--color-surface-main': '#ffffff',
          '--color-surface-variant': '#f1f5f9',
          '--color-text-primary': '#0f172a',
          '--color-text-secondary': '#475569',
          '--color-text-disabled': '#94a3b8',
          '--color-text-inverse': '#ffffff',
          '--color-border-main': '#e2e8f0',
          '--color-border-light': '#f1f5f9',
          '--color-border-dark': '#cbd5e1',
        },
        '.dark': {
          '--color-background-main': '#020617',
          '--color-background-paper': '#0f172a',
          '--color-background-default': '#020617',
          '--color-surface-main': '#0f172a',
          '--color-surface-variant': '#1e293b',
          '--color-text-primary': '#f8fafc',
          '--color-text-secondary': '#cbd5e1',
          '--color-text-disabled': '#64748b',
          '--color-text-inverse': '#0f172a',
          '--color-border-main': '#334155',
          '--color-border-light': '#1e293b',
          '--color-border-dark': '#475569',
        },
      })
    },
    // Custom utilities plugin
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        },
        '.text-balance': {
          'text-wrap': 'balance'
        },
        '.bg-grid': {
          'background-image': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(15 23 42 / 0.04)'%3e%3cpath d='m0 .5h32m-32 32v-32'/%3e%3c/svg%3e")`,
        },
        '.bg-gradient-radial': {
          'background-image': 'radial-gradient(circle, var(--tw-gradient-stops))',
        },
      })
    },
  ],
}