import { Link, NavLink } from 'react-router-dom'
import BottomTabBar from './BottomTabBar'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { NAV_ITEMS } from './navItems'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="safe-top sticky top-0 z-30 border-b border-line" style={{ background: 'var(--color-nav)' }}>
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-serif text-[17px] font-bold text-ink">
            <Logo size={26} />
            일기 룰렛
          </Link>
          <div className="flex-1" />
          <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-card ${
                    isActive ? 'font-semibold text-accent' : 'text-ink-mid'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="pb-tab-bar flex-1 md:pb-10">{children}</main>

      <BottomTabBar />
    </div>
  )
}
