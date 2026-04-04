/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', '"Noto Serif KR"', 'serif'],
        body: ['"Noto Serif KR"', 'serif'],
      },
      colors: {
        lang: { DEFAULT: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
        view: { DEFAULT: '#0891b2', light: '#67e8f9', dark: '#0e7490' },
        time: { DEFAULT: '#d97706', light: '#fcd34d', dark: '#b45309' },
        visual: { DEFAULT: '#db2777', light: '#f9a8d4', dark: '#9d174d' },
        creative: { DEFAULT: '#65a30d', light: '#bef264', dark: '#4d7c0f' },
        surface: '#161b22',
        card: '#21262d',
        border: '#30363d',
      },
      keyframes: {
        shred: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        celebrate: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
      animation: {
        shred: 'shred 1.5s ease-in forwards',
        fadeIn: 'fadeIn 0.4s ease-out',
        celebrate: 'celebrate 0.6s ease-in-out',
      },
    },
  },
  plugins: [],
}
