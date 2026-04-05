import { NavLink, useLocation } from 'react-router-dom'
import { Home, Archive, FileText, BarChart2 } from 'lucide-react'

const TABS = [
  { to: '/',        icon: Home,      label: '홈'       },
  { to: '/archive', icon: Archive,   label: '보관함'   },
  { to: '/drafts',  icon: FileText,  label: '임시저장' },
  { to: '/stats',   icon: BarChart2, label: '통계'     },
] as const

export default function BottomTabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-stretch"
      style={{
        background: 'var(--color-bg-nav)',
        borderColor: 'var(--color-card)',
        backdropFilter: 'blur(8px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ to, icon: Icon, label }) => {
        const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
        return (
          <NavLink
            key={to}
            to={to}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
            style={{
              color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
            }}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-xs font-medium">{label}</span>
            {isActive && (
              <span
                className="absolute top-1.5 w-1 h-1 rounded-full"
                style={{ background: 'var(--color-accent)' }}
              />
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
