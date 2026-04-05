import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getAllJournals, type JournalEntry } from '../db/indexedDB'
import { useCooldown } from '../hooks/useCooldown'
import { missions, CATEGORY_COLORS, CATEGORY_LABELS, type MissionCategory } from '../data/missions'
import { exportToJSON } from '../utils/exportData'
import { validateExportData, importFromJSON } from '../utils/importData'
import type { ExportData } from '../utils/exportData'
import { useTheme } from '../contexts/ThemeContext'

export default function Stats() {
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { getActiveCooldowns, loading: cooldownLoading } = useCooldown()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    getAllJournals()
      .then((list) => setJournals(list.filter((j) => j.status === 'completed')))
      .finally(() => setLoading(false))
  }, [])

  if (loading || cooldownLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-sm animate-pulse" style={{ color: 'var(--color-muted)' }}>로딩 중…</div>
      </div>
    )
  }

  const completedCount = journals.length

  // Count by category
  const categoryCount: Record<MissionCategory, number> = {
    lang: 0, view: 0, time: 0, visual: 0, creative: 0,
  }
  for (const j of journals) {
    const m = missions.find((x) => x.id === j.missionId)
    if (m) categoryCount[m.category]++
  }

  // Count completions per mission (can exceed 1 due to 7-day rolling cooldown)
  const missionCount: Record<string, number> = {}
  for (const j of journals) {
    missionCount[j.missionId] = (missionCount[j.missionId] ?? 0) + 1
  }

  const activeCooldowns = getActiveCooldowns()

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--color-bg-nav)', borderColor: 'var(--color-card)', backdropFilter: 'blur(8px)' }}
      >
        <Link to="/" className="p-1.5 rounded-lg hover-surface transition-colors" style={{ color: 'var(--color-text-mid)' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold font-serif" style={{ color: 'var(--color-text)' }}>통계</h1>
        <div className="ml-auto">
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
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{CATEGORY_LABELS[cat]}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{categoryCount[cat]}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Per-mission completion counts */}
        <Section title="미션별 완료 횟수">
          <div className="space-y-5">
            {(Object.keys(CATEGORY_LABELS) as MissionCategory[]).map((cat) => {
              const catMissions = missions.filter((m) => m.category === cat)
              const colors = CATEGORY_COLORS[cat]
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: colors.bg }} />
                    <span className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.text }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {catMissions.map((m) => {
                      const count = missionCount[m.id] ?? 0
                      const barWidth = count === 0 ? 0 : Math.min((count / Math.max(...Object.values(missionCount), 1)) * 100, 100)
                      return (
                        <div key={m.id}
                          className="flex items-center gap-3 py-1.5 px-3 rounded-lg"
                          style={{ background: 'var(--color-card)' }}>
                          <span className="text-xs flex-1 truncate"
                            style={{ color: count > 0 ? 'var(--color-text)' : 'var(--color-muted)' }}>
                            {m.title}
                          </span>
                          <div className="w-20 h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'var(--color-border)' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${barWidth}%`, background: colors.bg }} />
                          </div>
                          <span className="text-xs font-bold tabular-nums w-6 text-right"
                            style={{ color: count > 0 ? colors.text : 'var(--color-muted)' }}>
                            {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
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
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: colors.bg }} />
                      <span className="text-xs" style={{ color: 'var(--color-text)' }}>{mission.title}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{entry.daysLeft}일 후 해금</span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Data Management */}
        <Section title="데이터 관리 / Data Management">
          <DataManagement />
        </Section>
      </div>
    </div>
  )
}

// ─── Data Management ──────────────────────────────────────────────────────────

function DataManagement() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingData, setPendingData] = useState<ExportData | null>(null)
  const [importWarning, setImportWarning] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleExport() {
    try {
      await exportToJSON()
      showToast('내보내기 완료 ✅', true)
    } catch (e) {
      showToast(`내보내기 실패: ${e}`, false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch {
        showToast('올바른 JSON 파일이 아닙니다.', false)
        return
      }

      const result = validateExportData(raw)
      if (!result.valid || !result.data) {
        showToast('올바른 JSON 파일이 아닙니다.', false)
        return
      }

      setPendingData(result.data)
      setImportWarning(result.warning ?? null)
      setShowConfirm(true)
    }
    reader.readAsText(file)
  }

  async function handleConfirmImport() {
    if (!pendingData) return
    setShowConfirm(false)
    try {
      await importFromJSON(pendingData)
      showToast('가져오기 완료 ✅', true)
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      showToast(`가져오기 실패: ${e}`, false)
    }
    setPendingData(null)
    setImportWarning(null)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        캔버스 항목이 많으면 백업 파일이 클 수 있습니다. JSON 파일에는 모든 일기와 미션 기록이 포함됩니다.
      </p>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 active:scale-95"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          📤 Export JSON
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 active:scale-95"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          📥 Import JSON
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Confirmation modal */}
      {showConfirm && pendingData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="rounded-2xl border p-6 max-w-sm w-full space-y-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>데이터 가져오기</h3>
            {importWarning && (
              <p className="text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
                ⚠️ {importWarning}
              </p>
            )}
            <p className="text-sm" style={{ color: 'var(--color-text-mid)' }}>
              이 작업은 현재 데이터를 모두 덮어씁니다. 계속하시겠습니까?
            </p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              This will overwrite all current data. Continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setPendingData(null) }}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                가져오기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            background: toast.ok ? '#1a2e1a' : '#2e1a1a',
            border: `1px solid ${toast.ok ? '#2ea043' : '#da3633'}`,
            color: toast.ok ? '#3fb950' : '#f85149',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-mid)' }}>{title}</h2>
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
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-card)" strokeWidth={r - innerR} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--color-muted)">
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
          stroke="var(--color-card)"
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
        <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="bold" fill="var(--color-text)">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--color-muted)">
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
              fill={filled ? '#65a30d' : 'var(--color-card)'}
              opacity={filled ? 1 : 0.6}
            >
              <title>{date}</title>
            </rect>
          )
        })}
      </svg>
      <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>최근 16주</p>
    </div>
  )
}
