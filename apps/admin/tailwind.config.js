/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Matching the main app's brand palette
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
        accent: {
          500: '#14BDBD',
          600: '#0d9488',
        },
        gold: {
          DEFAULT: '#C5A059',
          light: '#D4B781',
        },
        // Admin-specific dark sidebar palette
        sidebar: {
          bg: '#0f1623',
          border: '#1e2d40',
          hover: '#1a2535',
          active: '#1e3a4a',
          text: '#94a3b8',
          textActive: '#e2e8f0',
        },
        // Main content background
        canvas: '#f0f4f8',
        surface: {
          50:  '#f8fafb',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.06)',
        'glow': '0 0 20px rgba(13,115,119,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
