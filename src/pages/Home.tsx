import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Dices, Flame } from 'lucide-react'
import SlotMachinePicker from '../components/SlotMachine/SlotMachinePicker'
import MissionCard from '../components/Mission/MissionCard'
import Loading from '../components/shared/Loading'
import { useTodayMission } from '../hooks/useTodayMission'
import { getAllJournals, type JournalEntry } from '../db/indexedDB'
import { getMission } from '../data/missions'
import { formatDateLong } from '../lib/date'
import { computeStreaks } from '../lib/streak'

interface Summary {
  todayEntry: JournalEntry | null
  streak: number
  pastDrafts: number
  totalEntries: number
}

export default function Home() {
  const { today, todayRecord, loading, drawMission } = useTodayMission()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [justDrew, setJustDrew] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getAllJournals()
      .then((all) => {
        if (!alive) return
        const completed = all.filter((j) => j.status === 'completed').map((j) => j.id)
        setSummary({
          todayEntry: all.find((j) => j.id === today) ?? null,
          streak: computeStreaks(completed, today).current,
          pastDrafts: all.filter((j) => j.status === 'draft' && j.id !== today).length,
          totalEntries: all.length,
        })
      })
      .catch(() => {
        if (alive) setSummary({ todayEntry: null, streak: 0, pastDrafts: 0, totalEntries: 0 })
      })
    return () => {
      alive = false
    }
  }, [today])

  const handleSpin = useCallback(async () => {
    setError(null)
    setSpinning(true)
    setJustDrew(true)
    try {
      await drawMission()
    } catch {
      setSpinning(false)
      setJustDrew(false)
      setError('미션을 뽑지 못했어요. 잠시 뒤 다시 눌러 주세요.')
    }
  }, [drawMission])

  const handleSpinComplete = useCallback(() => setSpinning(false), [])

  if (loading || !summary) return <Loading />

  // 오늘 이미 쓰기 시작한 일기가 있으면 그 미션이 오늘의 미션이다
  const entry = summary.todayEntry
  const mission = getMission(entry?.missionId) ?? getMission(todayRecord?.missionId)
  const extraData =
    entry?.extraData ?? (todayRecord?.missionId === mission?.id ? todayRecord?.extraData : undefined)
  const status = entry?.status === 'completed' ? 'completed' : entry ? 'draft' : 'new'

  const showMachine = !mission || spinning || justDrew

  let heading = '오늘은 어떤 일기를 써 볼까요?'
  let sub: string | null = '룰렛이 오늘 일기를 쓰는 방식을 정해 줘요. 한 번 뽑으면 하루 동안 바뀌지 않아요.'
  if (mission && !spinning) {
    if (status === 'completed') {
      heading = '오늘의 일기를 마쳤어요'
      sub = summary.streak >= 2 ? `${summary.streak}일째 이어서 쓰고 있어요.` : '내일 새로운 미션으로 만나요.'
    } else if (status === 'draft') {
      heading = '쓰던 일기가 기다리고 있어요'
      sub = null
    } else {
      heading = justDrew ? '오늘의 미션이 나왔어요' : '오늘의 미션'
      sub = null
    }
  }

  const action =
    status === 'completed'
      ? { label: '오늘 쓴 일기 보기', to: `/archive/${today}` }
      : { label: status === 'draft' ? '이어 쓰기' : '쓰기 시작', to: '/write' }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-6">
      <p className="text-sm text-muted">{formatDateLong(today)}</p>
      <h1 className="mt-1 font-serif text-[26px] font-bold leading-snug text-ink">{heading}</h1>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-ink-mid">{sub}</p>}

      {showMachine && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <SlotMachinePicker
            targetMissionId={todayRecord?.missionId ?? null}
            spinning={spinning}
            onSpinComplete={handleSpinComplete}
          />
          {!mission && !spinning && (
            <button type="button" onClick={handleSpin} className="btn-primary w-full max-w-[360px] py-3 text-base">
              <Dices className="h-5 w-5" />
              오늘의 미션 뽑기
            </button>
          )}
          {spinning && <p className="text-sm text-muted">두근두근…</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}

      {mission && !spinning && (
        <div className="mt-6 animate-fadeIn">
          <MissionCard mission={mission} extraData={extraData} action={action} />
        </div>
      )}

      {!spinning && summary.streak >= 2 && status !== 'completed' && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-mid">
          <Flame className="h-4 w-4 text-accent" aria-hidden="true" />
          {summary.streak}일째 이어 쓰는 중이에요
        </p>
      )}

      {!spinning && summary.pastDrafts > 0 && (
        <Link
          to="/drafts"
          className="panel mt-4 flex items-center justify-between px-4 py-3 text-sm text-ink-mid transition-colors hover:bg-card"
        >
          <span>
            쓰다 만 일기 <strong className="text-ink">{summary.pastDrafts}편</strong>이 남아 있어요
          </span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      )}

      {!mission && !spinning && summary.totalEntries === 0 && (
        <ol className="mt-8 space-y-3 border-t border-line pt-6 text-sm text-ink-mid">
          <HowTo step={1}>룰렛을 돌리면 오늘 일기를 쓰는 방식이 정해져요.</HowTo>
          <HowTo step={2}>미션 규칙대로 써 보세요. 쓰는 중에는 자동으로 저장돼요.</HowTo>
          <HowTo step={3}>다 쓰면 기록에 차곡차곡 쌓여요. 같은 미션은 7일 동안 다시 나오지 않아요.</HowTo>
        </ol>
      )}
    </div>
  )
}

function HowTo({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-ink-mid">
        {step}
      </span>
      <span className="pt-0.5 leading-relaxed">{children}</span>
    </li>
  )
}
