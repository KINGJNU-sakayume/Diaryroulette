import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PenLine, Trash2 } from 'lucide-react'
import { getJournalsByStatus, deleteJournal, type JournalEntry } from '../db/indexedDB'
import { missions } from '../data/missions'
import { getLocalDateString, getEffectiveDateString } from '../hooks/useTodayMission'
import CategoryBadge from '../components/shared/CategoryBadge'

export default function Drafts() {
  const navigate = useNavigate()
  const today = getEffectiveDateString()
  const [drafts, setDrafts] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [hasTodayDraft, setHasTodayDraft] = useState(false)

  const loadDrafts = useCallback(() => {
    getJournalsByStatus('draft')
      .then((list) => {
        setHasTodayDraft(list.some((j) => j.id === today && j.status === 'draft'))
        // Exclude today — today's draft is shown on the Write page
        const past = list
          .filter((j) => j.id !== today)
          .sort((a, b) => b.id.localeCompare(a.id))
        setDrafts(past)
      })
      .finally(() => setLoading(false))
  }, [today])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const handleContinue = useCallback(
    (entry: JournalEntry) => {
      navigate(`/write?date=${entry.id}&missionId=${entry.missionId}`)
    },
    [navigate],
  )

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id)
    await deleteJournal(id)
    setDrafts((prev) => prev.filter((d) => d.id !== id))
    setConfirmDelete(null)
    setDeleting(null)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-sm animate-pulse" style={{ color: 'var(--color-muted)' }}>로딩 중…</div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {hasTodayDraft && (
          <div
            className="text-sm mb-4 p-3 rounded-lg flex items-center justify-between gap-2"
            style={{ background: 'var(--color-card)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
          >
            <span>오늘의 미션은 홈에서 이어쓸 수 있어요</span>
            <Link to="/" style={{ color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>홈으로 가기</Link>
          </div>
        )}
        {drafts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>임시저장된 일기가 없습니다.</p>
          </div>
        ) : (
          <>
            {/* Count shown in page body since header is now global */}
            <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
              {drafts.length}개의 임시저장된 일기
            </p>
            <div className="space-y-3">
              {drafts.map((entry) => {
                const mission = missions.find((m) => m.id === entry.missionId)
                if (!mission) return null
                const isConfirming = confirmDelete === entry.id

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border p-4"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CategoryBadge category={mission.category} size="sm" />
                          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{entry.id}</span>
                        </div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{mission.title}</h3>
                        {entry.content && (
                          <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--color-muted)' }}>
                            {entry.content.slice(0, 80)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleContinue(entry)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors"
                        style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-dark)' }}
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        이어 쓰기
                      </button>

                      {isConfirming ? (
                        <>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting === entry.id}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors"
                            style={{ background: '#ef444422', color: '#f87171', border: '1px solid #dc2626' }}
                          >
                            {deleting === entry.id ? '삭제 중…' : '확인'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="py-2 px-3 rounded-lg text-xs hover-surface"
                            style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(entry.id)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs transition-colors"
                          style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          포기하기
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
