import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Flame, Image, ImageOff, Smile } from 'lucide-react'
import { getAllJournals, type JournalEntry } from '../db/indexedDB'
import { missions } from '../data/missions'
import CategoryBadge from '../components/shared/CategoryBadge'

interface ModalState {
  entry: JournalEntry
  mission: ReturnType<typeof missions.find>
}

/**
 * Canvas 컨텐츠를 <img src>에 넣기 전 방어.
 * import 경로로 들어온 악성 dataURL(javascript: 스킴 등)이나 손상된
 * 레코드가 그대로 렌더되지 않도록 이미지/Base64 스킴만 허용한다.
 * importData.ts의 isSafeImageDataUrl과 정책이 일치해야 한다.
 */
function isSafeImageDataUrl(src: string | null | undefined): src is string {
  if (typeof src !== 'string') return false
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src)
}

export default function Archive() {
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState | null>(null)
  const navigate = useNavigate()
  // /archive/:date 딥링크 파라미터. 예: /archive/2026-04-19
  const { date: dateParam } = useParams<{ date?: string }>()

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

  // URL의 :date가 바뀌면 해당 엔트리의 모달을 자동으로 연다.
  // (목록 로드 완료 후 실행되어야 하므로 journals 의존성 포함)
  useEffect(() => {
    if (!dateParam) {
      setModal(null)
      return
    }
    if (journals.length === 0) return
    const entry = journals.find((j) => j.id === dateParam)
    if (!entry) return
    const mission = missions.find((m) => m.id === entry.missionId)
    if (!mission) return
    setModal({ entry, mission })
  }, [dateParam, journals])

  // 모달 닫기 — URL도 /archive로 되돌린다.
  // replace:true로 뒤로가기 히스토리가 쌓이지 않도록.
  const closeModal = () => {
    if (dateParam) {
      navigate('/archive', { replace: true })
    } else {
      setModal(null)
    }
  }

  useEffect(() => {
    document.body.style.overflow = modal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modal])

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
        {journals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>아직 완료된 일기가 없습니다.</p>
            <Link to="/" className="text-violet-400 text-sm hover:underline mt-2 inline-block">
              첫 미션 시작하기
            </Link>
          </div>
        ) : (
          <>
            {/* Count shown in page body since header is now global */}
            <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
              {journals.length}개의 완료된 일기
            </p>
            <div className="space-y-3">
              {journals.map((entry) => {
                const mission = missions.find((m) => m.id === entry.missionId)
                if (!mission) return null
                return (
                  <button
                    key={entry.id}
                    onClick={() => navigate(`/archive/${entry.id}`)}
                    className="w-full text-left rounded-xl border p-4 transition-all hover-surface"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CategoryBadge category={mission.category} size="sm" />
                          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{entry.id}</span>
                        </div>
                        <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text)' }}>{mission.title}</h3>
                        <JournalPreview entry={entry} />
                      </div>

                      {entry.type === 'canvas' && isSafeImageDataUrl(entry.content) && (
                        <img
                          src={entry.content}
                          alt="썸네일"
                          className="w-16 h-10 object-cover rounded shrink-0 border"
                          style={{ borderColor: 'var(--color-border)' }}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-xl rounded-2xl border p-6 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <CategoryBadge category={modal.mission!.category} />
                <h2 className="text-xl font-bold font-serif mt-2" style={{ color: 'var(--color-text)' }}>
                  {modal.mission!.title}
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{modal.entry.id}</p>
              </div>
              <button
                onClick={closeModal}
                className="text-xl shrink-0"
                style={{ color: 'var(--color-muted)' }}
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
      <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
        <Image className="w-3 h-3" />
        드로잉
      </p>
    )
  }
  if (!entry.content) {
    return <p className="text-xs italic" style={{ color: 'var(--color-muted)' }}>내용 없음</p>
  }
  // Detect emoji-only
  const isEmoji = /^[\p{Emoji}\p{Emoji_Presentation}\uFE0F\s]+$/u.test(entry.content)
  if (isEmoji) {
    return (
      <p className="text-xl leading-tight">{entry.content.slice(0, 20)}</p>
    )
  }
  return (
    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-mid)' }}>
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
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>이 일기의 내용은 파쇄되었습니다.</p>
      </div>
    )
  }
  if (entry.type === 'canvas' && entry.content) {
    if (!isSafeImageDataUrl(entry.content)) {
      return (
        <div
          className="flex flex-col items-center gap-2 py-8 rounded-xl border"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <ImageOff className="w-8 h-8" style={{ color: 'var(--color-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            이 드로잉은 손상되어 표시할 수 없습니다.
          </p>
        </div>
      )
    }
    return (
      <img
        src={entry.content}
        alt="드로잉"
        className="w-full rounded-xl border"
        style={{ borderColor: 'var(--color-border)' }}
      />
    )
  }
  if (!entry.content) {
    return <p className="italic text-sm" style={{ color: 'var(--color-muted)' }}>내용 없음</p>
  }

  // Check if emoji-only
  const isEmoji = /^[\p{Emoji}\p{Emoji_Presentation}\uFE0F\s]+$/u.test(entry.content)
  if (isEmoji) {
    return (
      <div className="text-3xl leading-loose p-4 rounded-xl" style={{ background: 'var(--color-card)' }}>
        <Smile className="w-4 h-4 inline mr-2" style={{ color: 'var(--color-muted)' }} />
        {entry.content}
      </div>
    )
  }

  return (
    <div
      className="text-sm leading-relaxed whitespace-pre-wrap p-4 rounded-xl"
      style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}
    >
      {entry.content}
    </div>
  )
}
