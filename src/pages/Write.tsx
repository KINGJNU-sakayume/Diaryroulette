import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'
import { missions, type Mission } from '../data/missions'
import { getJournal, saveJournal, getTodayMission, type JournalEntry } from '../db/indexedDB'
import { getLocalDateString } from '../hooks/useTodayMission'
import CategoryBadge from '../components/shared/CategoryBadge'
import TextEditor from '../components/Editor/TextEditor'
import TimedTextEditor from '../components/Editor/TimedTextEditor'
import CanvasEditor from '../components/Editor/CanvasEditor'
import EmojiEditor from '../components/Editor/EmojiEditor'
import TrashEditor from '../components/Editor/TrashEditor'
import { useTheme } from '../contexts/ThemeContext'

// Auto-save interval in ms
const AUTO_SAVE_MS = 5000

export default function Write() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const dateParam = searchParams.get('date')
  const missionIdParam = searchParams.get('missionId')
  const today = getLocalDateString()
  const targetDate = dateParam ?? today

  const [mission, setMission] = useState<Mission | null>(null)
  const [journal, setJournal] = useState<JournalEntry | null>(null)
  const [content, setContent] = useState('')
  const [extraData, setExtraData] = useState<Record<string, unknown> | undefined>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [completed, setCompleted] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const contentRef = useRef(content)
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Load mission + existing draft
  useEffect(() => {
    async function load() {
      let resolvedMissionId = missionIdParam
      let resolvedExtraData: Record<string, unknown> | undefined

      if (!resolvedMissionId) {
        const todayMission = await getTodayMission()
        if (todayMission?.date === today) {
          resolvedMissionId = todayMission.missionId
          resolvedExtraData = todayMission.extraData
        }
      } else {
        // Load extraData from today's mission if IDs match
        const todayMission = await getTodayMission()
        if (todayMission?.missionId === resolvedMissionId) {
          resolvedExtraData = todayMission.extraData
        }
      }

      if (!resolvedMissionId) {
        setLoading(false)
        return
      }

      const foundMission = missions.find((m) => m.id === resolvedMissionId)
      if (!foundMission) {
        setLoading(false)
        return
      }
      setMission(foundMission)

      // Load existing journal
      const existingJournal = await getJournal(targetDate)
      if (existingJournal) {
        if (existingJournal.status === 'completed') {
          navigate('/archive', { replace: true })
          return
        }
        setJournal(existingJournal)
        setContent(existingJournal.content ?? '')
        // BUG-6: fall back to journal's own extraData when today-mission lookup yielded nothing
        if (!resolvedExtraData && existingJournal.extraData) {
          resolvedExtraData = existingJournal.extraData
        }
      } else if (foundMission.template) {
        // FEAT-1: pre-fill with template only when no draft exists
        setContent(foundMission.template)
      }

      if (resolvedExtraData) {
        setExtraData(resolvedExtraData)
      }

      setLoading(false)
    }

    load()
  }, [targetDate, missionIdParam, today, navigate])

  const autoSaveDraft = useCallback(async () => {
    if (!mission) return
    const entry: JournalEntry = {
      id: targetDate,
      missionId: mission.id,
      type: mission.editorType === 'canvas' ? 'canvas' : mission.editorType === 'trash' ? 'trash' : 'text',
      content: contentRef.current || null,
      status: 'draft',
      createdAt: journal?.createdAt ?? new Date().toISOString(),
      completedAt: null,
      extraData: extraData ?? undefined,
    }
    await saveJournal(entry)
    setJournal(entry)
  }, [mission, targetDate, journal, extraData])

  const autoSaveDraftRef = useRef(autoSaveDraft)
  useEffect(() => {
    autoSaveDraftRef.current = autoSaveDraft
  }, [autoSaveDraft])

  // Auto-save draft
  useEffect(() => {
    if (!mission || loading) return

    autoSaveRef.current = setInterval(async () => {
      if (contentRef.current) {
        await autoSaveDraftRef.current()
      }
    }, AUTO_SAVE_MS)

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [mission, loading])

  const handleSave = useCallback(async () => {
    if (!mission) return
    setSaving(true)
    const entry: JournalEntry = {
      id: targetDate,
      missionId: mission.id,
      type: mission.editorType === 'canvas' ? 'canvas' : mission.editorType === 'trash' ? 'trash' : 'text',
      content: content || null,
      status: 'completed',
      createdAt: journal?.createdAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      extraData: extraData ?? undefined,
    }
    await saveJournal(entry)
    setSaving(false)
    setSaved(true)
    setCompleted(true)
    setTimeout(() => setSaved(false), 2000)
  }, [mission, targetDate, content, journal, extraData])

  const handleCanvasSave = useCallback(
    (dataUrl: string) => {
      setContent(dataUrl)
    },
    [],
  )

  const handleTrashShred = useCallback(async () => {
    if (!mission) return
    const entry: JournalEntry = {
      id: targetDate,
      missionId: mission.id,
      type: 'trash',
      content: null,
      status: 'completed',
      createdAt: journal?.createdAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }
    await saveJournal(entry)
    setCompleted(true)
  }, [mission, targetDate, journal])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-sm animate-pulse" style={{ color: 'var(--color-muted)' }}>로딩 중…</div>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--color-text-mid)' }}>미션을 찾을 수 없습니다.</p>
          <Link to="/" className="text-violet-400 hover:underline text-sm">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const isCanvas = mission.editorType === 'canvas'
  const isTimed = mission.editorType === 'timed-text'
  const isEmoji = mission.editorType === 'emoji-only'
  const isTrash = mission.editorType === 'trash'
  const isEmotionTemp = mission.id === 'visual-5'

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 border-b px-4 py-3 flex items-center justify-between gap-4"
        style={{ background: 'var(--color-bg-nav)', borderColor: 'var(--color-card)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="p-1.5 rounded-lg hover-surface transition-colors shrink-0"
            style={{ color: 'var(--color-text-mid)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CategoryBadge category={mission.category} size="sm" />
              <h1 className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>{mission.title}</h1>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{targetDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {!isTrash && !isCanvas && !completed && (
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  저장됨
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {saving ? '저장 중…' : '완료'}
                </>
              )}
            </button>
          )}

          {(isCanvas || isEmotionTemp) && !completed && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: '#db2777', color: '#fff' }}
            >
              <Save className="w-4 h-4" />
              {saving ? '저장 중…' : '완료'}
            </button>
          )}
        </div>
      </div>

      {/* Completed state */}
      {completed && !isTrash && (
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>오늘의 일기 완료!</h2>
          <p className="mb-8" style={{ color: 'var(--color-text-mid)' }}>수고했어요. 내일 또 새로운 미션이 기다립니다.</p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/archive"
              className="px-6 py-2.5 rounded-xl text-sm font-bold border transition-colors"
              style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            >
              보관함 보기
            </Link>
            <Link
              to="/"
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              홈으로
            </Link>
          </div>
        </div>
      )}

      {/* Editor */}
      {!completed && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Mission description reminder */}
          <div
            className="mb-6 p-4 rounded-xl border text-sm"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-mid)' }}
          >
            {mission.description}
          </div>

          {/* creative-1 inspiration card */}
          {mission.id === 'creative-1' && typeof extraData?.inspirationCard === 'string' && (
            <div
              className="mb-4 p-4 rounded-xl text-sm italic"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-accent)',
              }}
            >
              <span className="text-xs not-italic opacity-60 block mb-1">✨ 오늘의 영감 카드</span>
              &ldquo;{extraData.inspirationCard}&rdquo;
            </div>
          )}

          {/* Render correct editor */}
          {isTrash && (
            <TrashEditor
              value={content}
              onChange={setContent}
              onShred={handleTrashShred}
            />
          )}
          {isEmoji && (
            <EmojiEditor value={content} onChange={setContent} />
          )}
          {isCanvas && (
            <CanvasEditor
              initialDataUrl={journal?.content}
              onSave={handleCanvasSave}
              isEmotionTemp={isEmotionTemp}
            />
          )}
          {isTimed && (
            <TimedTextEditor
              value={content}
              onChange={setContent}
              mission={mission}
              extraData={extraData}
            />
          )}
          {!isTrash && !isEmoji && !isCanvas && !isTimed && (
            <TextEditor
              value={content}
              onChange={setContent}
              missionId={mission.id}
              extraData={extraData}
              charLimit={mission.charLimit}
            />
          )}
        </div>
      )}
    </div>
  )
}
