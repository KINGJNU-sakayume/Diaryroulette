import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RotateCw, BookOpen, Archive, BarChart2, FileText } from 'lucide-react'
import SlotMachinePicker from '../components/SlotMachine/SlotMachinePicker'
import { missions } from '../data/missions'
import MissionCard from '../components/Roulette/MissionCard'
import { useTodayMission } from '../hooks/useTodayMission'
import { getJournalsByStatus } from '../db/indexedDB'

export default function Home() {
  const { todayRecord, mission, loading, drawMission } = useTodayMission()
  const [isSpinning, setIsSpinning] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    getJournalsByStatus('completed').then((list) => setCompletedCount(list.length))
  }, [])

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-slate-500 text-sm animate-pulse">로딩 중…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0d1117' }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: '#0d1117ee', borderColor: '#21262d', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold font-serif text-white">일기 룰렛</span>
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/archive" icon={<Archive className="w-4 h-4" />} label="보관함" />
          <NavLink to="/drafts" icon={<FileText className="w-4 h-4" />} label="임시저장" />
          <NavLink to="/stats" icon={<BarChart2 className="w-4 h-4" />} label="통계" />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-serif text-white mb-2">
            오늘의 글쓰기 미션
          </h1>
          <p className="text-slate-500 text-sm">
            {todayRecord
              ? '오늘의 미션이 정해졌습니다'
              : '룰렛을 돌려 오늘의 제약을 받아보세요'}
          </p>
        </div>

        {/* Cycle progress */}
        <div
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm"
          style={{ background: '#161b22', borderColor: '#30363d' }}
        >
          <span className="text-slate-400">이번 사이클 진행도</span>
          <span className="font-bold text-white">
            {completedCount} / {missions.length} 완료 🎯
          </span>
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
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
            >
              <RotateCw className="w-5 h-5" />
              룰렛 돌리기
            </button>
          )}

          {isSpinning && (
            <div className="text-slate-400 text-sm animate-pulse">
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

        {/* Quick links */}
        <div className="w-full grid grid-cols-3 gap-3">
          <QuickCard
            to="/archive"
            icon={<Archive className="w-5 h-5" />}
            label="보관함"
            sub="완료한 일기"
            color="#0891b2"
          />
          <QuickCard
            to="/drafts"
            icon={<BookOpen className="w-5 h-5" />}
            label="임시저장"
            sub="미완성 일기"
            color="#d97706"
          />
          <QuickCard
            to="/stats"
            icon={<BarChart2 className="w-5 h-5" />}
            label="통계"
            sub="진행 현황"
            color="#65a30d"
          />
        </div>
      </div>
    </div>
  )
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      {icon}
      {label}
    </Link>
  )
}

function QuickCard({
  to,
  icon,
  label,
  sub,
  color,
}: {
  to: string
  icon: React.ReactNode
  label: string
  sub: string
  color: string
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:border-opacity-60 hover:scale-105"
      style={{ background: '#161b22', borderColor: '#30363d', color }}
    >
      {icon}
      <div className="text-center">
        <p className="text-xs font-bold text-white">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </Link>
  )
}
