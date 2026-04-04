import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getAllJournals, type JournalEntry } from '../db/indexedDB'
import { useCooldown } from '../hooks/useCooldown'
import { missions, CATEGORY_COLORS, CATEGORY_LABELS, type MissionCategory } from '../data/missions'

export default function Stats() {
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { getActiveCooldowns, loading: cooldownLoading } = useCooldown()

  useEffect(() => {
    getAllJournals()
      .then((list) => setJournals(list.filter((j) => j.status === 'completed')))
      .finally(() => setLoading(false))
  }, [])

  if (loading || cooldownLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-slate-500 text-sm animate-pulse">로딩 중…</div>
      </div>
    )
  }

  const completedCount = journals.length
  const totalMissions = missions.length

  // Count by category
  const categoryCount: Record<MissionCategory, number> = {
    lang: 0, view: 0, time: 0, visual: 0, creative: 0,
  }
  for (const j of journals) {
    const m = missions.find((x) => x.id === j.missionId)
    if (m) categoryCount[m.category]++
  }

  const activeCooldowns = getActiveCooldowns()

  return (
    <div className="min-h-screen" style={{ background: '#0d1117' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: '#0d1117ee', borderColor: '#21262d', backdropFilter: 'blur(8px)' }}
      >
        <Link to="/" className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold font-serif text-white">통계</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Cycle progress */}
        <Section title="사이클 진행도">
          <div className="text-center py-4">
            <div className="text-5xl font-bold text-white mb-1">
              {completedCount}
              <span className="text-2xl text-slate-500"> / {totalMissions}</span>
            </div>
            <p className="text-slate-500 text-sm">미션 완료</p>
            <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: '#21262d' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(completedCount / totalMissions) * 100}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #0891b2)',
                }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-2">
              {totalMissions - completedCount}개 남음
            </p>
          </div>
        </Section>

        {/* Donut chart */}
        <Section title="카테고리별 완료">
          <DonutChart categoryCount={categoryCount} total={completedCount} />
          <div className="grid grid-cols-5 gap-2 mt-4">
            {(Object.keys(categoryCount) as MissionCategory[]).map((cat) => (
              <div key={cat} className="text-center">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ background: CATEGORY_COLORS[cat].bg }}
                />
                <p className="text-xs text-slate-500">{CATEGORY_LABELS[cat]}</p>
                <p className="text-sm font-bold text-white">{categoryCount[cat]}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Streak calendar */}
        <Section title="기록 달력">
          <StreakCalendar journals={journals} />
        </Section>

        {/* Cooldowns */}
        {activeCooldowns.length > 0 && (
          <Section title={`쿨다운 중 (${activeCooldowns.length}개)`}>
            <div className="space-y-2">
              {activeCooldowns.map((entry) => {
                const mission = missions.find((m) => m.id === entry.missionId)
                if (!mission) return null
                const colors = CATEGORY_COLORS[mission.category]
                return (
                  <div
                    key={entry.missionId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ background: '#161b22', borderColor: '#30363d' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: colors.bg }} />
                      <span className="text-xs text-white">{mission.title}</span>
                    </div>
                    <span className="text-xs text-slate-500">{entry.daysLeft}일 후 해금</span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: '#161b22', borderColor: '#30363d' }}>
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  )
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({
  categoryCount,
  total,
}: {
  categoryCount: Record<MissionCategory, number>
  total: number
}) {
  const SIZE = 160
  const cx = SIZE / 2
  const cy = SIZE / 2
  const r = 55
  const innerR = 35

  if (total === 0) {
    return (
      <div className="flex justify-center">
        <svg width={SIZE} height={SIZE}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#21262d" strokeWidth={r - innerR} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#8b949e">
            없음
          </text>
        </svg>
      </div>
    )
  }

  const categories = Object.keys(categoryCount) as MissionCategory[]
  let cumulative = 0
  const slices: Array<{ path: string; color: string }> = []

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = r
  const IR = innerR
  const strokeW = R - IR

  for (const cat of categories) {
    const count = categoryCount[cat]
    if (count === 0) continue
    const frac = count / total
    const startAngle = cumulative * 360 - 90
    const endAngle = (cumulative + frac) * 360 - 90
    const large = frac > 0.5 ? 1 : 0

    const midR = (R + IR) / 2
    const x1 = cx + midR * Math.cos(toRad(startAngle))
    const y1 = cy + midR * Math.sin(toRad(startAngle))
    const x2 = cx + midR * Math.cos(toRad(endAngle))
    const y2 = cy + midR * Math.sin(toRad(endAngle))

    slices.push({
      path: `M ${x1} ${y1} A ${midR} ${midR} 0 ${large} 1 ${x2} ${y2}`,
      color: CATEGORY_COLORS[cat].bg,
    })
    cumulative += frac
  }

  return (
    <div className="flex justify-center">
      <svg width={SIZE} height={SIZE}>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={(R + IR) / 2}
          fill="none"
          stroke="#21262d"
          strokeWidth={strokeW}
        />
        {/* Slices */}
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.path}
            fill="none"
            stroke={slice.color}
            strokeWidth={strokeW - 2}
            strokeLinecap="round"
          />
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="bold" fill="#e6edf3">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#8b949e">
          완료
        </text>
      </svg>
    </div>
  )
}

// ─── Streak Calendar ──────────────────────────────────────────────────────────

function StreakCalendar({ journals }: { journals: JournalEntry[] }) {
  const completedDates = new Set(journals.map((j) => j.id))

  // Show last 16 weeks (112 days)
  const today = new Date()
  const WEEKS = 16
  const days: Array<{ date: string; filled: boolean }> = []

  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ date: dateStr, filled: completedDates.has(dateStr) })
  }

  const CELL = 12
  const GAP = 2
  const colCount = WEEKS
  const rowCount = 7

  return (
    <div className="overflow-x-auto">
      <svg
        width={colCount * (CELL + GAP) - GAP}
        height={rowCount * (CELL + GAP) - GAP}
        className="block"
      >
        {days.map(({ date, filled }, i) => {
          const col = Math.floor(i / 7)
          const row = i % 7
          const x = col * (CELL + GAP)
          const y = row * (CELL + GAP)
          return (
            <rect
              key={date}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={2}
              fill={filled ? '#65a30d' : '#21262d'}
              opacity={filled ? 1 : 0.6}
            >
              <title>{date}</title>
            </rect>
          )
        })}
      </svg>
      <p className="text-xs text-slate-600 mt-2">최근 16주</p>
    </div>
  )
}
