import { useLocation, Link, NavLink } from 'react-router-dom'
import { Archive, FileText, BarChart2 } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import BottomTabBar from './BottomTabBar'

// Map of routes to Korean page titles shown on mobile header
const PAGE_TITLES: Record<string, string> = {
  '/':        '일기 룰렛',
  '/archive': '보관함',
  '/drafts':  '임시저장',
  '/stats':   '통계',
}

interface LayoutProps {
  children: React.ReactNode
  /** Optional count badge rendered next to the page title on mobile (e.g. "32개") */
  badge?: string
}

export default function Layout({ children, badge }: LayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const pageTitle = PAGE_TITLES[pathname] ?? '일기 룰렛'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── Global header ─────────────────────────────────────────── */}
      <header
        className="safe-top sticky top-0 z-30 border-b"
        style={{
          background: 'var(--color-bg-nav)',
          borderColor: 'var(--color-card)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center px-4 py-3 gap-3">

          {/* Logo — always links to home */}
          <Link
            to="/"
            className="font-bold font-serif shrink-0"
            style={{ color: 'var(--color-text)', fontSize: '1.1rem' }}
          >
            일기 룰렛
          </Link>

          {/* Mobile: current page title + optional badge (hidden on desktop) */}
          <div className="flex items-center gap-2 md:hidden ml-1">
            {pathname !== '/' && (
              <span
                className="text-base font-bold font-serif"
                style={{ color: 'var(--color-text)' }}
              >
                {pageTitle}
              </span>
            )}
            {badge && (
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                {badge}
              </span>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop nav links (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1">
            <DesktopNavLink to="/archive" icon={<Archive className="w-4 h-4" />} label="보관함" />
            <DesktopNavLink to="/drafts"  icon={<FileText className="w-4 h-4" />} label="임시저장" />
            <DesktopNavLink to="/stats"   icon={<BarChart2 className="w-4 h-4" />} label="통계" />
          </nav>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────────── */}
      <main className="flex-1 pb-tab-bar md:pb-0">
        {children}
      </main>

      {/* ── Bottom tab bar (mobile only) ──────────────────────────── */}
      <BottomTabBar />

    </div>
  )
}

// ── Desktop nav link helper ────────────────────────────────────────────────────

function DesktopNavLink({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <NavLink
      to={to}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover-surface"
      style={({ isActive }) => ({
        color: isActive ? 'var(--color-accent)' : 'var(--color-text-mid)',
        fontWeight: isActive ? 600 : 400,
      })}
    >
      {icon}
      {label}
    </NavLink>
  )
}
