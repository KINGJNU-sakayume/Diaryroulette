import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'

export default function BottomTabBar() {
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line md:hidden"
      style={{ background: 'var(--color-nav)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              isActive ? 'text-accent' : 'text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.7} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
