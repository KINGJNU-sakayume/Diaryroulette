import { useEffect, useMemo, useState } from 'react'
import { getAllJournals, type JournalEntry } from '../db/indexedDB'
import { useCooldown } from '../hooks/useCooldown'
import { getMission, missions } from '../data/missions'
import { CATEGORIES, CATEGORY_ORDER, type MissionCategory } from '../data/categories'
import { addDays, formatDateShort, getEffectiveDateString, parseDateId } from '../lib/date'
import { computeStreaks } from '../lib/streak'
import Loading from '../components/shared/Loading'
import Section from '../components/shared/Section'

export default function Stats() {
  const [journals, setJournals] = useState<JournalEntry[] | null>(null)
  const { getActiveCooldowns, loading: cooldownLoading } = useCooldown()
  const today = getEffectiveDateString()

  useEffect(() => {
    let alive = true
    getAllJournals()
      .then((list) => {
        if (alive) setJournals(list.filter((j) => j.status === 'completed'))
      })
      .catch(() => {
        if (alive) setJournals([])
      })
    return () => {
      alive = false
    }
  }, [])

  const stats = useMemo(() => {
    const list = journals ?? []
    const byCategory = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<MissionCategory, number>
    const byMission: Record<string, number> = {}
    for (const j of list) {
      const m = getMission(j.missionId)
      if (m) byCategory[m.category]++
      byMission[j.missionId] = (byMission[j.missionId] ?? 0) + 1
    }
    const { current, longest } = computeStreaks(
      list.map((j) => j.id),
      today,
    )
    const thisMonth = list.filter((j) => j.id.startsWith(today.slice(0, 7))).length
    return { total: list.length, byCategory, byMission, current, longest, thisMonth }
  }, [journals, today])

  if (!journals || cooldownLoading) return <Loading />

  const resting = new Map(getActiveCooldowns().map((c) => [c.missionId, c.daysLeft]))
  const maxCategory = Math.max(1, ...Object.values(stats.byCategory))

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
      <h1 className="font-serif text-2xl font-bold text-ink">통계</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="모든 기록" value={stats.total} unit="편" />
        <StatTile label="지금 연속" value={stats.current} unit="일" />
        <StatTile label="최장 연속" value={stats.longest} unit="일" />
        <StatTile label="이번 달" value={stats.thisMonth} unit="편" />
      </div>

      <Section title="기록 달력" description="최근 20주 동안 일기를 쓴 날이에요.">
        <Calendar journals={journals} today={today} />
      </Section>

      <Section title="카테고리별 기록">
        {stats.total === 0 ? (
          <p className="text-sm text-muted">일기를 마치면 어떤 종류를 많이 썼는지 보여 드릴게요.</p>
        ) : (
          <ul className="space-y-2.5">
            {CATEGORY_ORDER.map((cat) => {
              const n = stats.byCategory[cat]
              const pct = Math.round((n / stats.total) * 100)
              return (
                <li key={cat} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm" title={`${CATEGORIES[cat].label} ${n}편 (${pct}%)`}>
                  <span className="flex items-center gap-2 text-ink-mid">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORIES[cat].color }} aria-hidden="true" />
                    {CATEGORIES[cat].label}
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-card">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(n / maxCategory) * 100}%`, background: CATEGORIES[cat].color }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-ink">{n}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="미션별 기록" description="한 번 나온 미션은 7일 동안 쉬었다가 다시 나와요.">
        <div className="space-y-2">
          {CATEGORY_ORDER.map((cat) => {
            const list = missions.filter((m) => m.category === cat)
            const done = list.filter((m) => stats.byMission[m.id]).length
            return (
              <details key={cat} className="group rounded-xl border border-line [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORIES[cat].color }} aria-hidden="true" />
                  <span className="font-semibold text-ink">{CATEGORIES[cat].label}</span>
                  <span className="hidden text-muted sm:inline">· {CATEGORIES[cat].blurb}</span>
                  <span className="ml-auto shrink-0 text-muted">
                    {done}/{list.length}
                  </span>
                </summary>
                <table className="w-full border-t border-line text-sm">
                  <thead className="sr-only">
                    <tr>
                      <th>미션</th>
                      <th>쓴 횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((m) => {
                      const n = stats.byMission[m.id] ?? 0
                      const days = resting.get(m.id)
                      return (
                        <tr key={m.id} className="border-b border-line last:border-0">
                          <td className="px-4 py-2.5">
                            <span className={n ? 'text-ink' : 'text-muted'}>{m.title}</span>
                            {days !== undefined && <span className="ml-2 whitespace-nowrap text-xs text-muted">{days}일 뒤 다시 나와요</span>}
                          </td>
                          <td className="w-16 px-4 py-2.5 text-right tabular-nums text-ink-mid">{n ? `${n}번` : '–'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </details>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

function StatTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="panel px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold text-ink">
        {value.toLocaleString()}
        <span className="ml-0.5 font-sans text-sm font-normal text-ink-mid">{unit}</span>
      </p>
    </div>
  )
}

// ─── 기록 달력 ────────────────────────────────────────────────────────────────

const WEEKS = 20
const CELL = 13
const GAP = 3
const LEFT = 18
const TOP = 14
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function Calendar({ journals, today }: { journals: JournalEntry[]; today: string }) {
  const [hover, setHover] = useState<string | null>(null)
  const written = useMemo(() => new Map(journals.map((j) => [j.id, j])), [journals])

  // 맨 오른쪽 열이 이번 주가 되도록, 20주 전 일요일부터 시작한다
  const start = addDays(today, -(parseDateId(today).getDay() + (WEEKS - 1) * 7))
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))

  const hoverEntry = hover ? written.get(hover) : undefined
  const hoverText = hover
    ? `${formatDateShort(hover)} · ${hoverEntry ? (getMission(hoverEntry.missionId)?.title ?? '일기') : '기록 없음'}`
    : '칸을 누르거나 가리키면 그날의 미션이 보여요'

  const width = LEFT + WEEKS * (CELL + GAP) - GAP
  const height = TOP + 7 * (CELL + GAP) - GAP

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`최근 ${WEEKS}주 동안 ${days.filter((d) => written.has(d)).length}일 기록`}>
        {[1, 3, 5].map((row) => (
          <text key={row} x={LEFT - 5} y={TOP + row * (CELL + GAP) + CELL / 2} textAnchor="end" dominantBaseline="middle" fontSize="8" fill="var(--color-muted)">
            {DAY_LABELS[row]}
          </text>
        ))}
        {Array.from({ length: WEEKS }, (_, col) => {
          const first = days[col * 7]
          const month = parseDateId(first).getMonth()
          const prevMonth = col > 0 ? parseDateId(days[(col - 1) * 7]).getMonth() : -1
          if (month === prevMonth) return null
          return (
            <text key={col} x={LEFT + col * (CELL + GAP)} y={TOP - 4} fontSize="8" fill="var(--color-muted)">
              {month + 1}월
            </text>
          )
        })}
        {days.map((d, i) => {
          if (d > today) return null
          const col = Math.floor(i / 7)
          const row = i % 7
          const isWritten = written.has(d)
          return (
            <rect
              key={d}
              x={LEFT + col * (CELL + GAP)}
              y={TOP + row * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={3}
              fill={isWritten ? 'var(--color-accent)' : 'var(--color-card)'}
              stroke={d === today ? 'var(--color-text)' : 'none'}
              strokeWidth={d === today ? 1.5 : 0}
              onPointerEnter={() => setHover(d)}
              onPointerDown={() => setHover(d)}
              onPointerLeave={() => setHover(null)}
            />
          )
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span aria-live="polite" className={hover ? 'text-ink-mid' : undefined}>
          {hoverText}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> 쓴 날
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-card" /> 안 쓴 날
          </span>
        </span>
      </div>
    </div>
  )
}
