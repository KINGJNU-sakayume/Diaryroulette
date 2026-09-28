import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { getAllJournals, type JournalEntry } from '../db/indexedDB'
import { useCooldown } from '../hooks/useCooldown'
import { getMission, missions } from '../data/missions'
import { CATEGORIES, CATEGORY_ORDER, type MissionCategory } from '../data/categories'
import { addDays, formatDateShort, getEffectiveDateString, parseDateId } from '../lib/date'
import { computeStreaks } from '../lib/streak'
import { exportToJSON, type ExportData } from '../utils/exportData'
import { importFromJSON, validateExportData } from '../utils/importData'
import Loading from '../components/shared/Loading'
import Modal from '../components/shared/Modal'

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

      <Section title="백업" description="일기는 이 기기의 브라우저에만 저장돼요. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 파일로 백업해 두세요.">
        <Backup />
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

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
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

// ─── 백업 ─────────────────────────────────────────────────────────────────────

function Backup() {
  const [pending, setPending] = useState<{ data: ExportData; warning?: string } | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const notify = (text: string, ok: boolean) => setMessage({ text, ok })

  const handleExport = async () => {
    try {
      await exportToJSON()
      notify('백업 파일을 저장했어요.', true)
    } catch {
      notify('백업 파일을 만들지 못했어요.', false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    file
      .text()
      .then((text) => {
        const result = validateExportData(JSON.parse(text))
        if (!result.valid || !result.data) throw new Error('invalid')
        setPending({ data: result.data, warning: result.warning })
      })
      .catch(() => notify('일기 룰렛 백업 파일이 아닌 것 같아요.', false))
  }

  const confirmImport = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await importFromJSON(pending.data)
      setPending(null)
      notify('백업을 불러왔어요. 화면을 새로 고칠게요.', true)
      setTimeout(() => window.location.reload(), 1000)
    } catch {
      notify('백업을 불러오지 못했어요. 지금 데이터는 그대로예요.', false)
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleExport} className="btn-secondary">
          <Download className="h-4 w-4" />
          백업 파일 저장
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
          <Upload className="h-4 w-4" />
          백업 불러오기
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
      </div>

      {message && (
        <p role="status" className={`text-sm ${message.ok ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}

      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="백업을 불러올까요?"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setPending(null)} className="btn-secondary flex-1">
              취소
            </button>
            <button type="button" onClick={confirmImport} disabled={busy} className="btn-primary flex-1">
              {busy ? '불러오는 중…' : '불러오기'}
            </button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3 text-sm text-ink-mid">
            <p>
              백업 파일의 일기 <strong className="text-ink">{pending.data.journals.length}편</strong>으로 지금 데이터를 모두
              바꿔요. 지금 기기에만 있는 일기는 사라져요.
            </p>
            {pending.warning && <p className="rounded-lg bg-danger-soft px-3 py-2 text-danger">{pending.warning}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
