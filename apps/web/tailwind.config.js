/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep Teal — Primary Accent (#0D7377)
        primary: {
          50:  '#f0fafa',
          100: '#d1eded',
          200: '#a3dbdb',
          300: '#75c8c8',
          400: '#47b6b6',
          500: '#0D7377', 
          600: '#0b666a',
          700: '#095a5d',
          800: '#074d50',
          900: '#054143',
          950: '#032a2c',
        },
        // Soft Teal — Secondary Accent (#14BDBD)
        accent: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14BDBD',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Surface — Slate for light/dim themes
        surface: {
          50:  '#f8fafb', // Off-white
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
        // Charcoal — Premium Text/Backgrounds
        charcoal: {
          DEFAULT: '#1A2332',
          muted: '#6B7280',
        },
        // Gold — Saudi Premium Accent
        gold: {
          DEFAULT: '#C5A059',
          light: '#D4B781',
          dark: '#A68545',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-ibm-plex-arabic)', 'Noto Naskh Arabic', 'sans-serif'],
        display: ['var(--font-playfair)', 'serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-teal': 'linear-gradient(135deg, #0D7377 0%, #14BDBD 100%)',
        'gradient-dim': 'linear-gradient(135deg, #0f172a 0%, #054143 100%)',
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 10px -2px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 20px 40px -12px rgba(0, 0, 0, 0.1), 0 8px 16px -8px rgba(0, 0, 0, 0.08)',
        'glow-teal': '0 0 20px rgba(13, 115, 119, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl'),
  ],
};
