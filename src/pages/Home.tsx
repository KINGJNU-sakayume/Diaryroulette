import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { RotateCw, Archive, BarChart2, FileText } from 'lucide-react'
import SlotMachinePicker from '../components/SlotMachine/SlotMachinePicker'
import MissionCard from '../components/Roulette/MissionCard'
import { useTodayMission } from '../hooks/useTodayMission'
import { useTheme } from '../contexts/ThemeContext'
import BottomTabBar from '../components/shared/BottomTabBar'

export default function Home() {
  const { todayRecord, mission, loading, drawMission } = useTodayMission()
  const [isSpinning, setIsSpinning] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const handleSpin = useCallback(async () => {
    if (isSpinning || todayRecord) return
    setIsSpinning(true)
    await drawMission()
    // onSpinComplete will be called by the wheel animation
  }, [isSpinning, todayRecord, drawMission])

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false)
  }, [])

  const targetMissionId = todayRecord?.missionId ?? null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-sm animate-pulse" style={{ color: 'var(--color-muted)' }}>로딩 중…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Nav */}
      <nav
        className="safe-top sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'var(--color-bg-nav)', borderColor: 'var(--color-card)', backdropFilter: 'blur(8px)' }}
      >
        {/* Brand */}
        <span className="text-xl font-bold font-serif" style={{ color: 'var(--color-text)' }}>일기 룰렛</span>

        {/* Desktop nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/archive" icon={<Archive className="w-4 h-4" />} label="보관함" />
          <NavLink to="/drafts"  icon={<FileText className="w-4 h-4" />} label="임시저장" />
          <NavLink to="/stats"   icon={<BarChart2 className="w-4 h-4" />} label="통계" />
        </div>

        {/* Theme toggle — always visible */}
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
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8 pb-tab-bar">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-serif mb-2" style={{ color: 'var(--color-text)' }}>
            오늘의 글쓰기 미션
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {todayRecord
              ? '오늘의 미션이 정해졌습니다'
              : '룰렛을 돌려 오늘의 제약을 받아보세요'}
          </p>
        </div>

        {/* Roulette wheel */}
        <div className="flex flex-col items-center gap-6">
          <SlotMachinePicker
            targetMissionId={targetMissionId}
            isSpinning={isSpinning}
            onSpinComplete={handleSpinComplete}
          />

          {!todayRecord && !isSpinning && (
            <button
              onClick={handleSpin}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', color: '#fff' }}
            >
              <RotateCw className="w-5 h-5" />
              룰렛 돌리기
            </button>
          )}

          {isSpinning && (
            <div className="text-sm animate-pulse" style={{ color: 'var(--color-text-mid)' }}>
              미션을 추첨하는 중…
            </div>
          )}
        </div>

        {/* Mission card — shown after spin or if already drawn today */}
        {mission && todayRecord && !isSpinning && (
          <div className="w-full animate-fadeIn">
            <MissionCard
              mission={mission}
              extraData={todayRecord.extraData}
            />
          </div>
        )}

      </div>
      <BottomTabBar />
    </div>
  )
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover-surface transition-colors"
      style={{ color: 'var(--color-text-mid)' }}
    >
      {icon}
      {label}
    </Link>
  )
}

