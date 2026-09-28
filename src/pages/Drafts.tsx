import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PenLine, Trash2 } from 'lucide-react'
import { deleteJournal, getJournalsByStatus, type JournalEntry } from '../db/indexedDB'
import { getMission } from '../data/missions'
import { formatDateShort, formatTime, getEffectiveDateString } from '../lib/date'
import CategoryBadge from '../components/shared/CategoryBadge'
import Loading from '../components/shared/Loading'
import { JournalSnippet, JournalThumb } from '../components/Journal/JournalPreview'

export default function Drafts() {
  const today = getEffectiveDateString()
  const [drafts, setDrafts] = useState<JournalEntry[] | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getJournalsByStatus('draft')
      .then((list) => {
        if (alive) setDrafts(list.sort((a, b) => b.id.localeCompare(a.id)))
      })
      .catch(() => {
        if (alive) setDrafts([])
      })
    return () => {
      alive = false
    }
  }, [])

  const remove = async (id: string) => {
    setBusy(id)
    try {
      await deleteJournal(id)
      setDrafts((list) => list?.filter((d) => d.id !== id) ?? null)
      setConfirming(null)
    } finally {
      setBusy(null)
    }
  }

  if (!drafts) return <Loading />

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <h1 className="font-serif text-2xl font-bold text-ink">쓰던 글</h1>
      <p className="mb-5 mt-1 text-sm text-muted">완료하지 않은 일기는 자동으로 여기에 남아요. 날짜가 지나도 이어 쓸 수 있어요.</p>

      {drafts.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <p className="text-[15px] text-ink-mid">쓰다 만 일기가 없어요.</p>
          <p className="mt-1 text-sm text-muted">깔끔하네요!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {drafts.map((entry) => {
            const mission = getMission(entry.missionId)
            if (!mission) return null
            const isToday = entry.id === today
            const isConfirming = confirming === entry.id
            return (
              <li key={entry.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <CategoryBadge category={mission.category} />
                      <span className="text-xs text-muted">
                        {isToday ? '오늘' : formatDateShort(entry.id)} · {formatTime(entry.createdAt)} 시작
                      </span>
                    </div>
                    <h2 className="mb-1 text-[15px] font-semibold text-ink">{mission.title}</h2>
                    <JournalSnippet entry={entry} mission={mission} />
                  </div>
                  <JournalThumb entry={entry} />
                </div>

                <div className="mt-4 flex gap-2">
                  {isConfirming ? (
                    <>
                      <span className="flex-1 self-center text-sm text-ink-mid">정말 지울까요?</span>
                      <button type="button" onClick={() => setConfirming(null)} className="btn-ghost text-sm">
                        취소
                      </button>
                      <button type="button" onClick={() => remove(entry.id)} disabled={busy === entry.id} className="btn-danger text-sm">
                        {busy === entry.id ? '지우는 중…' : '지우기'}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to={`/write?date=${entry.id}&missionId=${entry.missionId}`} className="btn-primary flex-1 text-sm">
                        <PenLine className="h-4 w-4" />
                        이어 쓰기
                      </Link>
                      <button type="button" onClick={() => setConfirming(entry.id)} className="btn-secondary text-sm" aria-label={`${formatDateShort(entry.id)} 쓰던 글 지우기`}>
                        <Trash2 className="h-4 w-4" />
                        지우기
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
