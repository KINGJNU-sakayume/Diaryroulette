import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

/** 브라우저 상단바(theme-color) 색. index.css의 --color-bg와 맞춘다. */
export const THEME_COLORS: Record<Theme, string> = {
  light: '#f6f2ea',
  dark: '#1b1916',
}

/**
 * 저장 키. kingjnu-sakayume.github.io 아래의 다른 앱(예: elosorter)도 'theme' 키를 써서
 * 앱 이름을 붙였다. 예전 키는 새 키가 없을 때 한 번만 읽는다.
 * index.html의 부트 스크립트와 같은 키여야 한다.
 */
export const THEME_KEY = 'diaryroulette:theme'
const LEGACY_THEME_KEY = 'theme'

export const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'light',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

/**
 * 초기 테마: 저장된 값 > 시스템 설정 > 라이트.
 * index.html의 부트 스크립트와 같은 규칙이어야 첫 화면이 깜빡이지 않는다.
 */
export function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem(THEME_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
