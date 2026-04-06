import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { missions } from '../../data/missions'
import {
  setTodayMission,
  setCooldownList,
  saveJournal,
  clearAllData,
  type JournalEntry,
} from '../../db/indexedDB'
import { getLocalDateString } from '../../hooks/useTodayMission'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const SAMPLE_LANG2_TEXT = '오늘 하루가 있었다. 피곤함이 있다. 기분이 좋지 않은 상태이다. 모든 것이 뒤엉켜 있다.'
const SAMPLE_TIME3_TEXT = '오늘 하루는 아침부터 저녁까지 정말 많은 일들이 있었고 그 모든 순간들이 머릿속을 가득 채우고 있어서 무척이나 복잡한 마음이다.'
const SAMPLE_LANG8_TEXT = '나는 가고 싶다. 달리기를 라디오를 마음껏 바라보며 아침부터.'
const SAMPLE_TIME8_TEXT = '오늘 하루는 아침부터 유독 바빴다. 출근길에 놓친 버스 한 대가 이미 하루의 시작을 알렸다. 점심은 편의점 도시락으로 빠르게 해결했고, 오후에는 회의가 두 개나 있었다. 그래도 퇴근 후 집에 돌아오면 따뜻한 국물 한 그릇이 기다리고 있다는 생각 하나로 버텼다. 오늘도 수고했다.'

// ─── Component ────────────────────────────────────────────────────────────────

export default function DevReviewPanel() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [selectedMissionId, setSelectedMissionId] = useState(missions[0].id)
  const [confirmReset, setConfirmReset] = useState(false)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function run(fn: () => Promise<void>, label: string) {
    try {
      await fn()
      showToast(`${label} ✅`, true)
    } catch (e) {
      showToast(`실패: ${e}`, false)
    }
  }

  // ─── Slot machine actions ──────────────────────────────────────────────────

  async function forceSpin() {
    await setTodayMission({ key: 'todayMission', date: '1970-01-01', missionId: missions[0].id })
    navigate('/')
    window.location.reload()
  }

  async function forceResult() {
    const today = getLocalDateString()
    const mission = missions.find((m) => m.id === selectedMissionId)!
    let extraData: Record<string, unknown> | undefined
    if (mission.id === 'lang-3') extraData = { bannedVowel: 'ㅏ' }
    if (mission.id === 'lang-4') extraData = { allowedVowel: 'ㅗ' }
    await setTodayMission({ key: 'todayMission', date: today, missionId: selectedMissionId, extraData })
    navigate('/')
    window.location.reload()
  }

  // ─── Editor shortcuts ─────────────────────────────────────────────────────

  function openEditor(missionId: string) {
    navigate(`/write?missionId=${missionId}`)
  }

  async function openWithPrefilledText(missionId: string, text: string, extraData?: Record<string, unknown>) {
    const today = getLocalDateString()
    // Set the todayMission so Write.tsx picks up extraData
    await setTodayMission({ key: 'todayMission', date: today, missionId, extraData })
    // Save a draft with the pre-filled text
    const journal: JournalEntry = {
      id: today,
      missionId,
      type: 'text',
      content: text,
      status: 'draft',
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    await saveJournal(journal)
    navigate(`/write?missionId=${missionId}`)
  }

  async function openLang3WithBannedVowel() {
    const today = getLocalDateString()
    const bannedVowel = 'ㅏ'
    await setTodayMission({ key: 'todayMission', date: today, missionId: 'lang-3', extraData: { bannedVowel } })
    navigate('/write?missionId=lang-3')
  }

  // ─── Data actions ─────────────────────────────────────────────────────────

  async function addDummyCompleted() {
    const date = offsetDate(-1)
    const journal: JournalEntry = {
      id: date,
      missionId: 'lang-1',
      type: 'text',
      content: '어제의 테스트 일기입니다. 더미 완료 항목입니다.',
      status: 'completed',
      createdAt: new Date(new Date().getTime() - 86400000).toISOString(),
      completedAt: new Date(new Date().getTime() - 86400000).toISOString(),
    }
    await saveJournal(journal)
  }

  async function addDummyDraft() {
    const date = offsetDate(-3)
    const journal: JournalEntry = {
      id: date,
      missionId: 'view-1',
      type: 'text',
      content: '3일 전 임시저장 더미 항목입니다.',
      status: 'draft',
      createdAt: new Date(new Date().getTime() - 3 * 86400000).toISOString(),
      completedAt: null,
    }
    await saveJournal(journal)
  }

  async function verifyArchiveRedirect() {
    const today = getLocalDateString()
    const journal: JournalEntry = {
      id: today,
      missionId: missions[0].id,
      type: 'text',
      content: '오늘 완료된 항목 테스트',
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }
    await saveJournal(journal)
    navigate('/write')
  }

  async function fillCycle() {
    for (let i = 0; i < missions.length; i++) {
      const date = offsetDate(-(i + 1))
      const m = missions[i]
      const journal: JournalEntry = {
        id: date,
        missionId: m.id,
        type: m.editorType === 'canvas' ? 'canvas' : m.editorType === 'trash' ? 'trash' : 'text',
        content: `더미 일기 #${i + 1} — ${m.title}`,
        status: 'completed',
        createdAt: new Date(new Date().getTime() - (i + 1) * 86400000).toISOString(),
        completedAt: new Date(new Date().getTime() - (i + 1) * 86400000).toISOString(),
      }
      await saveJournal(journal)
    }
  }

  async function insertSampleStatsData() {
    // Insert 10 varied completed entries across categories
    const picks = [
      missions.find((m) => m.category === 'lang')!,
      missions.find((m) => m.category === 'view')!,
      missions.find((m) => m.category === 'time')!,
      missions.find((m) => m.category === 'visual')!,
      missions.find((m) => m.category === 'creative')!,
      missions.filter((m) => m.category === 'lang')[1],
      missions.filter((m) => m.category === 'time')[1],
      missions.filter((m) => m.category === 'visual')[1],
      missions.filter((m) => m.category === 'creative')[1],
      missions.filter((m) => m.category === 'view')[1],
    ].filter(Boolean)

    for (let i = 0; i < picks.length; i++) {
      const m = picks[i]
      const date = offsetDate(-(i + 2))
      const journal: JournalEntry = {
        id: date,
        missionId: m.id,
        type: m.editorType === 'canvas' ? 'canvas' : 'text',
        content: `통계 페이지 샘플 일기 ${i + 1}`,
        status: 'completed',
        createdAt: new Date(new Date().getTime() - (i + 2) * 86400000).toISOString(),
        completedAt: new Date(new Date().getTime() - (i + 2) * 86400000).toISOString(),
      }
      await saveJournal(journal)
    }
    navigate('/stats')
  }

  async function resetAll() {
    await clearAllData()
    setConfirmReset(false)
    navigate('/')
    window.location.reload()
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 9999,
          background: '#161b22',
          border: '1px solid #30363d',
          color: '#8b949e',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        ⚙ Review Mode
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            padding: '1rem',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: 12,
              width: 360,
              maxHeight: 'calc(100vh - 2rem)',
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: 14 }}>⚙ Dev Review Panel</span>
              <button
                onClick={() => setOpen(false)}
                style={{ color: '#8b949e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Toast */}
            {toast && (
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  background: toast.ok ? '#1a2e1a' : '#2e1a1a',
                  border: `1px solid ${toast.ok ? '#2ea043' : '#da3633'}`,
                  color: toast.ok ? '#3fb950' : '#f85149',
                }}
              >
                {toast.msg}
              </div>
            )}

            <PanelSection title="🎰 Slot Machine">
              <ActionButton label="Force spin animation" onClick={() => run(forceSpin, 'Force spin')} />
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  value={selectedMissionId}
                  onChange={(e) => setSelectedMissionId(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    maxWidth: 160,
                    background: '#161b22',
                    border: '1px solid #30363d',
                    color: '#e6edf3',
                    borderRadius: 6,
                    padding: '4px 6px',
                    fontSize: 11,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>{m.id} — {m.title}</option>
                  ))}
                </select>
                <ActionButton label="Force result" onClick={() => run(forceResult, 'Force result')} />
              </div>
            </PanelSection>

            <PanelSection title="✏️ Editor Types">
              <ActionButton label="text editor (lang-1)" onClick={() => { openEditor('lang-1'); setOpen(false) }} />
              <ActionButton label="timed-text + backspace disabled (time-1)" onClick={() => { openEditor('time-1'); setOpen(false) }} />
              <ActionButton label="timed-text + countdown 30s (time-4)" onClick={() => { openEditor('time-4'); setOpen(false) }} />
              <ActionButton label="canvas editor (visual-1)" onClick={() => { openEditor('visual-1'); setOpen(false) }} />
              <ActionButton label="emoji-only editor (visual-2)" onClick={() => { openEditor('visual-2'); setOpen(false) }} />
              <ActionButton label="trash editor + shred (creative-8)" onClick={() => { openEditor('creative-8'); setOpen(false) }} />
              <ActionButton label="blackout editor (time-5)" onClick={() => { openEditor('time-5'); setOpen(false) }} />
              <ActionButton label="emotion temperature canvas (visual-5)" onClick={() => { openEditor('visual-5'); setOpen(false) }} />
            </PanelSection>

            <PanelSection title="🔍 Soft Highlighting">
              <ActionButton
                label="lang-2: pre-fill 이다/있다/없다 → verify red"
                onClick={() => run(() => openWithPrefilledText('lang-2', SAMPLE_LANG2_TEXT).then(() => setOpen(false)), 'lang-2 prefill')}
              />
              <ActionButton
                label="lang-3: bannedVowel=ㅏ → verify highlight"
                onClick={() => run(() => openLang3WithBannedVowel().then(() => setOpen(false)), 'lang-3 bannedVowel')}
              />
              <ActionButton
                label="time-3: pre-fill 110+ chars → verify overflow"
                onClick={() => run(() => openWithPrefilledText('time-3', SAMPLE_TIME3_TEXT).then(() => setOpen(false)), 'time-3 prefill')}
              />
              <ActionButton
                label="lang-8: pre-fill word consonant order → verify red on 나는"
                onClick={() => run(() => openWithPrefilledText('lang-8', SAMPLE_LANG8_TEXT).then(() => setOpen(false)), 'lang-8 prefill')}
              />
              <ActionButton
                label="time-8: pre-fill ~280 chars → verify under-300 indicator"
                onClick={() => run(() => openWithPrefilledText('time-8', SAMPLE_TIME8_TEXT).then(() => setOpen(false)), 'time-8 prefill')}
              />
            </PanelSection>

            <PanelSection title="🗄️ Data & Navigation">
              <ActionButton
                label="Add dummy completed entry (yesterday)"
                onClick={() => run(addDummyCompleted, 'Add completed')}
              />
              <ActionButton
                label="Add dummy draft entry (3 days ago)"
                onClick={() => run(addDummyDraft, 'Add draft')}
              />
              <ActionButton
                label="Verify /archive redirect (complete today + go to /write)"
                onClick={() => run(verifyArchiveRedirect, 'Archive redirect')}
              />
              <ActionButton
                label={`Fill cycle: ${missions.length} completed entries`}
                onClick={() => run(fillCycle, 'Fill cycle')}
              />
              <ActionButton
                label="Go to /stats with sample data"
                onClick={() => run(insertSampleStatsData, 'Sample stats data')}
              />
              <div>
                {!confirmReset ? (
                  <ActionButton
                    label="⚠️ Reset ALL data"
                    danger
                    onClick={() => setConfirmReset(true)}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ActionButton label="Cancel" onClick={() => setConfirmReset(false)} />
                    <ActionButton
                      label="CONFIRM RESET"
                      danger
                      onClick={() => run(resetAll, 'Reset all')}
                    />
                  </div>
                )}
              </div>
            </PanelSection>

            {/* Reset cooldowns helper */}
            <PanelSection title="🔄 Cooldown">
              <ActionButton
                label="Clear cooldown list"
                onClick={() => run(async () => { await setCooldownList([]) }, 'Clear cooldowns')}
              />
            </PanelSection>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#161b22',
        border: '1px solid #21262d',
        borderRadius: 8,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: '#58a6ff', marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 11,
        cursor: 'pointer',
        background: danger ? '#2e1a1a' : '#0d1117',
        border: `1px solid ${danger ? '#da3633' : '#21262d'}`,
        color: danger ? '#f85149' : '#c9d1d9',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
    >
      {label}
    </button>
  )
}
