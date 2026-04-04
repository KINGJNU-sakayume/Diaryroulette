import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Flame, Image, Smile } from 'lucide-react'
import { getAllJournals, type JournalEntry } from '../db/indexedDB'
import { missions } from '../data/missions'
import CategoryBadge from '../components/shared/CategoryBadge'

interface ModalState {
  entry: JournalEntry
  mission: ReturnType<typeof missions.find>
}

export default function Archive() {
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState | null>(null)

  useEffect(() => {
    getAllJournals()
      .then((list) => {
        const completed = list
          .filter((j) => j.status === 'completed')
          .sort((a, b) => b.id.localeCompare(a.id))
        setJournals(completed)
      })
      .finally(() => setLoading(false))
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
        <h1 className="text-lg font-bold font-serif text-white">보관함</h1>
        <span className="text-xs text-slate-500 ml-auto">{journals.length}개</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {journals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-sm">아직 완료된 일기가 없습니다.</p>
            <Link to="/" className="text-violet-400 text-sm hover:underline mt-2 inline-block">
              첫 미션 시작하기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {journals.map((entry) => {
              const mission = missions.find((m) => m.id === entry.missionId)
              if (!mission) return null
              return (
                <button
                  key={entry.id}
                  onClick={() => setModal({ entry, mission })}
                  className="w-full text-left rounded-xl border p-4 transition-all hover:border-slate-600 hover:bg-white/3"
                  style={{ background: '#161b22', borderColor: '#30363d' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CategoryBadge category={mission.category} size="sm" />
                        <span className="text-xs text-slate-500">{entry.id}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">{mission.title}</h3>
                      <JournalPreview entry={entry} />
                    </div>

                    {entry.type === 'canvas' && entry.content && (
                      <img
                        src={entry.content}
                        alt="썸네일"
                        className="w-16 h-10 object-cover rounded shrink-0 border"
                        style={{ borderColor: '#30363d' }}
                      />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border p-6 max-h-[80vh] overflow-y-auto"
            style={{ background: '#161b22', borderColor: '#30363d' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <CategoryBadge category={modal.mission!.category} />
                <h2 className="text-xl font-bold font-serif text-white mt-2">
                  {modal.mission!.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{modal.entry.id}</p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="text-slate-500 hover:text-white text-xl shrink-0"
              >
                ✕
              </button>
            </div>

            <JournalContent entry={modal.entry} />
          </div>
        </div>
      )}
    </div>
  )
}

function JournalPreview({ entry }: { entry: JournalEntry }) {
  if (entry.type === 'trash') {
    return (
      <p className="text-sm text-orange-400 flex items-center gap-1.5">
        <Flame className="w-3.5 h-3.5" />
        소각 완료
      </p>
    )
  }
  if (entry.type === 'canvas') {
    return (
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Image className="w-3 h-3" />
        드로잉
      </p>
    )
  }
  if (!entry.content) {
    return <p className="text-xs text-slate-600 italic">내용 없음</p>
  }
  // Detect emoji-only
  const isEmoji = /^[\p{Emoji}\p{Emoji_Presentation}\uFE0F\s]+$/u.test(entry.content)
  if (isEmoji) {
    return (
      <p className="text-xl leading-tight">{entry.content.slice(0, 20)}</p>
    )
  }
  return (
    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
      {entry.content.slice(0, 120)}
    </p>
  )
}

function JournalContent({ entry }: { entry: JournalEntry }) {
  if (entry.type === 'trash') {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Flame className="w-12 h-12 text-orange-500" />
        <p className="text-orange-400 font-bold">🔥 소각 완료</p>
        <p className="text-xs text-slate-500">이 일기의 내용은 파쇄되었습니다.</p>
      </div>
    )
  }
  if (entry.type === 'canvas' && entry.content) {
    return (
      <img
        src={entry.content}
        alt="드로잉"
        className="w-full rounded-xl border"
        style={{ borderColor: '#30363d' }}
      />
    )
  }
  if (!entry.content) {
    return <p className="text-slate-500 italic text-sm">내용 없음</p>
  }

  // Check if emoji-only
  const isEmoji = /^[\p{Emoji}\p{Emoji_Presentation}\uFE0F\s]+$/u.test(entry.content)
  if (isEmoji) {
    return (
      <div className="text-3xl leading-loose p-4 rounded-xl" style={{ background: '#21262d' }}>
        <Smile className="w-4 h-4 inline mr-2 text-slate-500" />
        {entry.content}
      </div>
    )
  }

  return (
    <div
      className="text-sm leading-relaxed whitespace-pre-wrap p-4 rounded-xl text-slate-300"
      style={{ background: '#21262d' }}
    >
      {entry.content}
    </div>
  )
}
