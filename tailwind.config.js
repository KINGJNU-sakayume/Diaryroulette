/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          '"Pretendard"',
          '"Malgun Gothic"',
          '"Noto Sans KR"',
          'system-ui',
          'sans-serif',
        ],
        serif: ['"Noto Serif KR"', '"Apple Myungjo"', 'serif'],
      },
      // 색은 index.css의 CSS 변수에서 온다 → 테마를 바꾸면 자동으로 따라간다
      colors: {
        page: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        line: 'var(--color-border)',
        ink: {
          DEFAULT: 'var(--color-text)',
          mid: 'var(--color-text-mid)',
        },
        muted: 'var(--color-muted)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          strong: 'var(--color-accent-strong)',
          soft: 'var(--color-accent-soft)',
          on: 'var(--color-on-accent)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          soft: 'var(--color-danger-soft)',
        },
        success: 'var(--color-success)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.35s ease-out',
      },
    },
  },
  plugins: [],
}
