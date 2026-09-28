import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../theme/theme'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const label = theme === 'dark' ? '밝은 화면으로' : '어두운 화면으로'
  return (
    <button type="button" onClick={toggleTheme} className="icon-btn" aria-label={label} title={label}>
      {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
