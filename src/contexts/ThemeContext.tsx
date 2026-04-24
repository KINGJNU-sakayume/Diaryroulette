import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'dark',
  toggleTheme: () => {},
})

/**
 * 초기 테마 결정 로직.
 * 우선순위: localStorage > OS 시스템 설정(prefers-color-scheme) > 'dark'(fallback)
 * index.html의 인라인 부트 스크립트와 완전히 동일해야 한다 — 그래야 FOUC가 안 생긴다.
 */
function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark' // SSR 방어
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // localStorage가 차단되어 있는 프라이버시 모드 등
    }

    // Keep the status bar colour in sync with the app theme
    const meta = document.getElementById('theme-color-meta') as HTMLMetaElement | null
    if (meta) {
      meta.content = theme === 'dark' ? '#0d1117' : '#FFFDF8'
    }
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
