import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, PenLine, Trash2 } from 'lucide-react'
import { getJournalsByStatus, deleteJournal, type JournalEntry } from '../db/indexedDB'
import { missions } from '../data/missions'
import { getLocalDateString } from '../hooks/useTodayMission'
import CategoryBadge from '../components/shared/CategoryBadge'

export default function Drafts() {
  const navigate = useNavigate()
  const today = getLocalDateString()
  const [drafts, setDrafts] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadDrafts = useCallback(() => {
    getJournalsByStatus('draft')
      .then((list) => {
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-slate-500 text-sm animate-pulse">로딩 중…</div>
      </div>
    )
  }

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
        <h1 className="text-lg font-bold font-serif text-white">임시저장</h1>
        <span className="text-xs text-slate-500 ml-auto">{drafts.length}개</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {drafts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-sm">임시저장된 일기가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((entry) => {
              const mission = missions.find((m) => m.id === entry.missionId)
              if (!mission) return null
              const isConfirming = confirmDelete === entry.id

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border p-4"
                  style={{ background: '#161b22', borderColor: '#30363d' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CategoryBadge category={mission.category} size="sm" />
                        <span className="text-xs text-slate-500">{entry.id}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{mission.title}</h3>
                      {entry.content && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {entry.content.slice(0, 80)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleContinue(entry)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors"
                      style={{ background: '#7c3aed22', color: '#a78bfa', border: '1px solid #5b21b6' }}
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
                          className="py-2 px-3 rounded-lg text-xs text-slate-500 border border-slate-700 hover:bg-white/5"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(entry.id)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs transition-colors text-slate-500 hover:text-red-400"
                        style={{ border: '1px solid #30363d' }}
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
        )}
      </div>
    </div>
  )
}
