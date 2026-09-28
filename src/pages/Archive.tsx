import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { deleteJournal, getJournalsByStatus, type JournalEntry } from '../db/indexedDB'
import { getMission } from '../data/missions'
import { CATEGORIES, CATEGORY_ORDER, type MissionCategory } from '../data/categories'
import { formatDateLong, formatMonth, parseDateId, weekdayLabel } from '../lib/date'
import CategoryBadge from '../components/shared/CategoryBadge'
import Loading from '../components/shared/Loading'
import Modal from '../components/shared/Modal'
import JournalContent from '../components/Journal/JournalContent'
import { JournalSnippet, JournalThumb } from '../components/Journal/JournalPreview'

type Filter = MissionCategory | 'all'

export default function Archive() {
  const [journals, setJournals] = useState<JournalEntry[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const { date } = useParams<{ date?: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let alive = true
    getJournalsByStatus('completed')
      .then((list) => {
        if (alive) setJournals(list.sort((a, b) => b.id.localeCompare(a.id)))
      })
      .catch(() => {
        if (alive) setJournals([])
      })
    return () => {
      alive = false
    }
  }, [])

  const openEntry = date && journals ? journals.find((j) => j.id === date) : undefined

  const close = () => {
    setConfirmingDelete(false)
    setDeleteError(false)
    // 목록에서 열었으면 뒤로 가기로 닫아 히스토리가 쌓이지 않게
    if ((location.state as { fromList?: boolean } | null)?.fromList) navigate(-1)
    else navigate('/archive', { replace: true })
  }

  const remove = async (id: string) => {
    try {
      await deleteJournal(id)
      setJournals((list) => list?.filter((j) => j.id !== id) ?? null)
      close()
    } catch {
      setDeleteError(true)
    }
  }

  const presentCategories = useMemo(() => {
    const set = new Set(journals?.map((j) => getMission(j.missionId)?.category).filter(Boolean))
    return CATEGORY_ORDER.filter((c) => set.has(c))
  }, [journals])

  const groups = useMemo(() => {
    const visible = (journals ?? []).filter((j) => filter === 'all' || getMission(j.missionId)?.category === filter)
    const map = new Map<string, JournalEntry[]>()
    for (const j of visible) {
      const key = j.id.slice(0, 7)
      map.set(key, [...(map.get(key) ?? []), j])
    }
    return [...map.entries()]
  }, [journals, filter])

  if (!journals) return <Loading />

  const openMission = getMission(openEntry?.missionId)

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-ink">기록</h1>
        {journals.length > 0 && <span className="text-sm text-muted">모두 {journals.length}편</span>}
      </div>

      {journals.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <p className="text-[15px] text-ink-mid">아직 다 쓴 일기가 없어요.</p>
          <p className="mt-1 text-sm text-muted">첫 일기를 마치면 여기에 차곡차곡 쌓여요.</p>
          <Link to="/" className="btn-primary mt-6">
            오늘의 미션 보러 가기
          </Link>
        </div>
      ) : (
        <>
          {presentCategories.length > 1 && (
            <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="카테고리로 거르기">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                전체
              </FilterChip>
              {presentCategories.map((c) => (
                <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)} dot={CATEGORIES[c].color}>
                  {CATEGORIES[c].label}
                </FilterChip>
              ))}
            </div>
          )}

          <div className="space-y-8">
            {groups.map(([month, entries]) => (
              <section key={month}>
                <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-ink-mid">
                  {formatMonth(`${month}-01`)}
                  <span className="font-normal text-muted">{entries.length}편</span>
                </h2>
                <ul className="panel divide-y divide-line overflow-hidden">
                  {entries.map((entry) => {
                    const mission = getMission(entry.missionId)
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/archive/${entry.id}`, { state: { fromList: true } })}
                          className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-card"
                        >
                          <span className="w-9 shrink-0 text-center">
                            <span className="block font-serif text-xl font-bold leading-none text-ink">
                              {parseDateId(entry.id).getDate()}
                            </span>
                            <span className="mt-1 block text-xs text-muted">{weekdayLabel(entry.id)}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="mb-1 flex flex-wrap items-center gap-2">
                              {mission && <CategoryBadge category={mission.category} />}
                              <span className="truncate text-[15px] font-semibold text-ink">{mission?.title ?? '알 수 없는 미션'}</span>
                            </span>
                            <JournalSnippet entry={entry} mission={mission} />
                          </span>
                          <JournalThumb entry={entry} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <Modal
        open={Boolean(openEntry)}
        onClose={close}
        eyebrow={
          openEntry && (
            <span className="flex flex-wrap items-center gap-2">
              {openMission && <CategoryBadge category={openMission.category} />}
              <span className="text-xs text-muted">{formatDateLong(openEntry.id)}</span>
            </span>
          )
        }
        title={openMission?.title ?? '일기'}
        footer={
          openEntry &&
          (confirmingDelete ? (
            <>
              <p className="flex-1 self-center text-sm text-ink-mid">
                {deleteError ? '지우지 못했어요. 다시 시도해 주세요.' : '이 일기를 지울까요? 되돌릴 수 없어요.'}
              </p>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="btn-ghost text-sm">
                취소
              </button>
              <button type="button" onClick={() => remove(openEntry.id)} className="btn-danger text-sm">
                지우기
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setConfirmingDelete(true)} className="btn-ghost text-sm text-danger">
                <Trash2 className="h-4 w-4" />
                지우기
              </button>
              <div className="flex-1" />
              <button type="button" onClick={close} className="btn-secondary text-sm">
                닫기
              </button>
            </>
          ))
        }
      >
        {openEntry && <JournalContent entry={openEntry} mission={openMission} />}
      </Modal>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean
  onClick: () => void
  dot?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active ? 'border-ink bg-ink text-page' : 'border-line bg-surface text-ink-mid hover:bg-card'
      }`}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden="true" />}
      {children}
    </button>
  )
}
