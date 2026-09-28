import { useEffect, useState } from 'react'
import { ThemeContext, THEME_COLORS, resolveInitialTheme, type Theme } from './theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // 사생활 보호 모드 등에서 저장이 막혀도 동작은 계속한다
    }
    document.getElementById('theme-color-meta')?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
