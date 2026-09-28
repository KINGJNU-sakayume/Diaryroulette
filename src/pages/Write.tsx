import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, CircleAlert, Scissors } from 'lucide-react'
import { getMission, journalTypeOf, type Mission } from '../data/missions'
import {
  deleteJournal,
  getAllJournals,
  getJournal,
  getTodayMission,
  saveJournal,
  type JournalEntry,
} from '../db/indexedDB'
import { formatDateLong, formatTime, getEffectiveDateString, isDateId } from '../lib/date'
import { joinAnswers, restoreValues, toAnswers } from '../lib/prompts'
import { computeStreaks } from '../lib/streak'
import { countChars, countEmoji } from '../lib/text'
import CategoryBadge from '../components/shared/CategoryBadge'
import ThemeToggle from '../components/shared/ThemeToggle'
import Loading from '../components/shared/Loading'
import MissionExtras from '../components/Mission/MissionExtras'
import JournalContent from '../components/Journal/JournalContent'
import TextEditor from '../components/Editor/TextEditor'
import TimedTextEditor from '../components/Editor/TimedTextEditor'
import CanvasEditor, { type CanvasApi } from '../components/Editor/CanvasEditor'
import EmojiEditor from '../components/Editor/EmojiEditor'
import TrashEditor from '../components/Editor/TrashEditor'
import PromptsEditor from '../components/Editor/PromptsEditor'

const AUTOSAVE_MS = 4000

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

export default function Write() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const today = getEffectiveDateString()

  // ?date=는 임시저장에서 이어 쓸 때만 붙는다. 미래 날짜나 잘못된 값은 무시.
  const rawDate = params.get('date')
  const dateParam = isDateId(rawDate) && rawDate <= today ? rawDate : null
  const missionParam = params.get('missionId')
  const targetDate = dateParam ?? today
  const backTo = dateParam ? '/drafts' : '/'

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [mission, setMission] = useState<Mission | null>(null)
  const [extraData, setExtraData] = useState<Record<string, unknown> | undefined>()
  const [text, setText] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [initialCanvas, setInitialCanvas] = useState<string | null>(null)
  const [canvasEmpty, setCanvasEmpty] = useState(true)
  const [restored, setRestored] = useState<{ elapsed: number; hue?: number }>({ elapsed: 0 })
  const [briefOpen, setBriefOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [done, setDone] = useState<{ entry: JournalEntry; streak: number } | null>(null)

  // 자동저장은 항상 "지금" 값을 봐야 해서 ref로도 들고 있는다
  const missionRef = useRef<Mission | null>(null)
  const extraRef = useRef<Record<string, unknown> | undefined>(undefined)
  const textRef = useRef('')
  const answersRef = useRef<string[]>([])
  const timerElapsedRef = useRef(0)
  const monoHueRef = useRef<number | undefined>(undefined)
  const canvasApi = useRef<CanvasApi | null>(null)
  const createdAtRef = useRef<string | null>(null)
  const draftExistsRef = useRef(false)
  const dirtyRef = useRef(false)
  const completedRef = useRef(false)

  // ── 불러오기 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [existing, record] = await Promise.all([getJournal(targetDate), getTodayMission()])
      if (!alive) return
      if (existing?.status === 'completed') {
        navigate(`/archive/${existing.id}`, { replace: true })
        return
      }
      const recordForDate = record?.date === targetDate ? record : undefined
      const m = getMission(existing?.missionId) ?? getMission(missionParam) ?? getMission(recordForDate?.missionId)
      if (!m) {
        setLoadState('missing')
        return
      }

      // 추첨값(금지 모음 등)은 오늘의 미션 기록에서, 이어 쓰는 경우엔 임시저장본에서
      const extra = {
        ...(recordForDate?.missionId === m.id ? recordForDate.extraData : undefined),
        ...existing?.extraData,
      }
      missionRef.current = m
      extraRef.current = Object.keys(extra).length ? extra : undefined
      createdAtRef.current = existing?.createdAt ?? null
      draftExistsRef.current = Boolean(existing)
      timerElapsedRef.current = typeof extra.timerElapsed === 'number' ? extra.timerElapsed : 0
      monoHueRef.current = typeof extra.monoHue === 'number' ? extra.monoHue : undefined
      setRestored({ elapsed: timerElapsedRef.current, hue: monoHueRef.current })

      if (m.editorType === 'canvas') {
        setInitialCanvas(existing?.content ?? null)
        setCanvasEmpty(!existing?.content)
      } else if (m.editorType === 'prompts') {
        const values = restoreValues(m.prompts ?? [], extra.answers, existing?.content)
        answersRef.current = values
        setAnswers(values)
      } else {
        textRef.current = existing?.content ?? ''
        setText(textRef.current)
      }
      setMission(m)
      setExtraData(extraRef.current)
      setBriefOpen(!existing)
      setLoadState('ready')
    })().catch(() => {
      if (alive) setLoadState('error')
    })
    return () => {
      alive = false
    }
  }, [targetDate, missionParam, navigate])

  // ── 저장 ────────────────────────────────────────────────────────────────────
  /** 지금 화면의 내용을 저장 가능한 형태로 모은다 */
  const collect = useCallback((): { content: string | null; extraData?: Record<string, unknown>; empty: boolean } => {
    const m = missionRef.current!
    const extra: Record<string, unknown> = { ...extraRef.current }
    delete extra.answers
    delete extra.timerElapsed
    delete extra.monoHue

    let content: string | null
    let empty: boolean
    if (m.editorType === 'canvas') {
      content = canvasApi.current?.getDataUrl() ?? null
      empty = !content
      if (monoHueRef.current !== undefined) extra.monoHue = monoHueRef.current
    } else if (m.editorType === 'prompts') {
      const list = toAnswers(m.prompts ?? [], answersRef.current)
      extra.answers = list
      content = joinAnswers(list) || null
      empty = !content
    } else {
      content = textRef.current || null
      empty = !textRef.current.trim()
      if (m.timerSeconds) extra.timerElapsed = timerElapsedRef.current
    }
    return { content, extraData: Object.keys(extra).length ? extra : undefined, empty }
  }, [])

  const persistDraft = useCallback(async () => {
    const m = missionRef.current
    if (!m || m.editorType === 'trash' || completedRef.current || !dirtyRef.current) return
    dirtyRef.current = false
    const { content, extraData, empty } = collect()
    try {
      if (empty) {
        // 다 지웠다면 빈 임시저장을 남기지 않는다
        if (draftExistsRef.current) {
          await deleteJournal(targetDate)
          draftExistsRef.current = false
        }
        return
      }
      const now = new Date().toISOString()
      createdAtRef.current ??= now
      await saveJournal({
        id: targetDate,
        missionId: m.id,
        type: journalTypeOf(m),
        content,
        status: 'draft',
        createdAt: createdAtRef.current,
        completedAt: null,
        extraData,
      })
      draftExistsRef.current = true
      setLastSavedAt(now)
      setError(null)
    } catch {
      dirtyRef.current = true
      setError('자동 저장에 실패했어요. 잠시 뒤 다시 시도할게요.')
    }
  }, [collect, targetDate])

  useEffect(() => {
    if (loadState !== 'ready') return
    const id = setInterval(persistDraft, AUTOSAVE_MS)
    const onHide = () => {
      if (document.visibilityState === 'hidden') void persistDraft()
    }
    const onPageHide = () => void persistDraft()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      // 뒤로 가기 등으로 화면을 떠날 때 마지막 내용까지 저장
      void persistDraft()
    }
  }, [loadState, persistDraft])

  // ── 입력 핸들러 ─────────────────────────────────────────────────────────────
  const changeText = useCallback((v: string) => {
    textRef.current = v
    dirtyRef.current = true
    setText(v)
  }, [])

  const changeAnswers = useCallback((v: string[]) => {
    answersRef.current = v
    dirtyRef.current = true
    setAnswers(v)
  }, [])

  const changeCanvas = useCallback((state: { empty: boolean; hue?: number }) => {
    dirtyRef.current = true
    if (state.hue !== undefined) monoHueRef.current = state.hue
    setCanvasEmpty(state.empty)
  }, [])

  const changeElapsed = useCallback((seconds: number) => {
    timerElapsedRef.current = seconds
    dirtyRef.current = true
  }, [])

  // ── 완료 ────────────────────────────────────────────────────────────────────
  const finish = useCallback(
    async (entry: JournalEntry) => {
      // 저장하는 사이 자동저장이 끼어들어 임시저장으로 덮어쓰지 않도록 먼저 막는다
      completedRef.current = true
      try {
        await saveJournal(entry)
      } catch (e) {
        completedRef.current = false
        throw e
      }
      const all = await getAllJournals().catch(() => [])
      const streak = computeStreaks(
        all.filter((j) => j.status === 'completed').map((j) => j.id),
        today,
      ).current
      setDone({ entry, streak })
      window.scrollTo(0, 0)
    },
    [today],
  )

  const blocker = mission ? completionBlocker(mission, { text, answers, canvasEmpty }) : null

  const complete = async () => {
    const m = missionRef.current
    if (!m || blocker || saving) return
    setSaving(true)
    setError(null)
    const { content, extraData } = collect()
    const now = new Date().toISOString()
    try {
      await finish({
        id: targetDate,
        missionId: m.id,
        type: journalTypeOf(m),
        content,
        status: 'completed',
        createdAt: createdAtRef.current ?? now,
        completedAt: now,
        extraData,
      })
    } catch {
      setError('저장하지 못했어요. 한 번 더 눌러 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const shred = async () => {
    const m = missionRef.current
    if (!m) return
    const now = new Date().toISOString()
    // 파쇄 미션은 내용 없이 "썼다"는 기록만 남긴다
    try {
      await finish({
        id: targetDate,
        missionId: m.id,
        type: 'trash',
        content: null,
        status: 'completed',
        createdAt: now,
        completedAt: now,
      })
    } catch {
      setError('기록을 남기지 못했어요.')
    }
  }

  // ── 화면 ────────────────────────────────────────────────────────────────────
  if (loadState === 'loading') return <Loading />

  if (loadState === 'missing' || loadState === 'error' || !mission) {
    return (
      <CenteredMessage
        title={loadState === 'error' ? '일기를 불러오지 못했어요' : '아직 오늘의 미션이 없어요'}
        body={loadState === 'error' ? '잠시 뒤 다시 열어 주세요.' : '룰렛을 돌려 미션을 먼저 뽑아 주세요.'}
        action={{ label: '처음으로', to: '/' }}
      />
    )
  }

  if (done) return <Finished mission={mission} entry={done.entry} streak={done.streak} isToday={targetDate === today} />

  const isTrash = mission.editorType === 'trash'
  const saveStatus = isTrash
    ? '저장되지 않는 글'
    : lastSavedAt
      ? `${formatTime(lastSavedAt)} 자동 저장됨`
      : '자동 저장 켜짐'

  return (
    <div className="min-h-screen bg-page pb-16">
      <header className="safe-top sticky top-0 z-30 border-b border-line" style={{ background: 'var(--color-nav)' }}>
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-2 sm:px-4">
          <Link to={backTo} className="icon-btn shrink-0" aria-label="뒤로">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[15px] font-bold leading-tight text-ink">{mission.title}</p>
            <p className="truncate text-xs text-muted">
              {formatDateLong(targetDate)} · {saveStatus}
            </p>
          </div>
          <ThemeToggle />
          {!isTrash && (
            <button type="button" onClick={complete} disabled={Boolean(blocker) || saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? '저장 중…' : '완료'}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        <details
          open={briefOpen}
          onToggle={(e) => setBriefOpen(e.currentTarget.open)}
          className="panel mb-4 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
            <span className="flex items-center gap-2">
              <CategoryBadge category={mission.category} />
              <span className="text-sm font-semibold text-ink">미션 안내</span>
            </span>
            <span className="text-xs text-muted">{briefOpen ? '접기' : '펼치기'}</span>
          </summary>
          <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
            <p className="text-[15px] leading-relaxed text-ink-mid">{mission.description}</p>
            {mission.rules && (
              <ul className="space-y-1">
                {mission.rules.map((r) => (
                  <li key={r} className="flex gap-2 text-sm text-ink-mid">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
            <MissionExtras extraData={extraData} />
          </div>
        </details>

        {mission.editorType === 'trash' && <TrashEditor mission={mission} value={text} onChange={changeText} onShred={shred} />}
        {mission.editorType === 'emoji-only' && <EmojiEditor value={text} onChange={changeText} />}
        {mission.editorType === 'prompts' && <PromptsEditor fields={mission.prompts ?? []} values={answers} onChange={changeAnswers} />}
        {mission.editorType === 'canvas' && (
          <CanvasEditor
            mode={mission.canvasMode ?? 'free'}
            guide={mission.canvasGuide}
            initialDataUrl={initialCanvas}
            initialHue={restored.hue}
            apiRef={canvasApi}
            onChange={changeCanvas}
          />
        )}
        {mission.editorType === 'timed-text' && mission.timerSeconds && (
          <TimedTextEditor
            mission={{ ...mission, timerSeconds: mission.timerSeconds }}
            value={text}
            onChange={changeText}
            extraData={extraData}
            initialElapsed={restored.elapsed}
            onElapsedChange={changeElapsed}
          />
        )}
        {mission.editorType === 'text' && <TextEditor mission={mission} value={text} onChange={changeText} extraData={extraData} />}

        {error && (
          <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {!isTrash && (
          <div className="mt-6 flex flex-col items-center gap-2">
            {blocker && <p className="text-sm text-muted">{blocker}</p>}
            <button type="button" onClick={complete} disabled={Boolean(blocker) || saving} className="btn-primary w-full max-w-sm py-3 text-base">
              <Check className="h-5 w-5" />
              {saving ? '저장 중…' : '다 썼어요'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

/** 완료 버튼을 누를 수 없는 이유. 누를 수 있으면 null. */
function completionBlocker(
  mission: Mission,
  state: { text: string; answers: string[]; canvasEmpty: boolean },
): string | null {
  switch (mission.editorType) {
    case 'trash':
      return null
    case 'canvas':
      return state.canvasEmpty ? '그림을 그려야 완료할 수 있어요' : null
    case 'prompts': {
      const left = state.answers.filter((a) => !a.trim()).length
      return left > 0 ? `빈 칸이 ${left}개 남았어요` : null
    }
    case 'emoji-only':
      return countEmoji(state.text) === 0 ? '이모지를 하나 이상 넣어 주세요' : null
    default: {
      if (!state.text.trim()) return '아직 쓴 내용이 없어요'
      const n = countChars(state.text)
      const { min, max } = mission.charLimit ?? {}
      if (min !== undefined && min === max && n !== min) return `정확히 ${min}자여야 해요 (지금 ${n}자)`
      if (min !== undefined && n < min) return `${(min - n).toLocaleString()}자 더 써야 완료할 수 있어요`
      if (max !== undefined && n > max) return `${n - max}자를 줄여야 완료할 수 있어요`
      return null
    }
  }
}

function Finished({ mission, entry, streak, isToday }: { mission: Mission; entry: JournalEntry; streak: number; isToday: boolean }) {
  const isTrash = entry.type === 'trash'
  return (
    <div className="min-h-screen bg-page">
      <main className="safe-top mx-auto max-w-xl px-4 pb-16 pt-12 animate-fadeIn">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            {isTrash ? <Scissors className="h-7 w-7" /> : <Check className="h-7 w-7" strokeWidth={2.5} />}
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            {isTrash ? '깨끗하게 파쇄했어요' : isToday ? '오늘의 일기를 마쳤어요' : `${formatDateLong(entry.id)} 일기를 마쳤어요`}
          </h1>
          <p className="mt-2 text-[15px] text-ink-mid">
            {isTrash
              ? '털어놓은 만큼 마음이 가벼워졌길 바라요.'
              : streak >= 2
                ? `${streak}일 연속으로 쓰고 있어요.`
                : '수고했어요. 내일은 또 다른 미션이 기다려요.'}
          </p>
        </div>

        {!isTrash && (
          <section className="panel mb-6 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CategoryBadge category={mission.category} />
              <span className="text-sm font-semibold text-ink">{mission.blackout ? '이렇게 썼어요' : mission.title}</span>
            </div>
            <JournalContent entry={entry} mission={mission} />
          </section>
        )}

        <div className="flex gap-2">
          {!isTrash && (
            <Link to={`/archive/${entry.id}`} className="btn-secondary flex-1 py-3">
              기록에서 보기
            </Link>
          )}
          <Link to="/" className="btn-primary flex-1 py-3">
            처음으로
          </Link>
        </div>
      </main>
    </div>
  )
}

function CenteredMessage({ title, body, action }: { title: string; body: string; action: { label: string; to: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6">
      <div className="text-center">
        <h1 className="font-serif text-xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-mid">{body}</p>
        <Link to={action.to} className="btn-primary mt-6">
          {action.label}
        </Link>
      </div>
    </div>
  )
}
