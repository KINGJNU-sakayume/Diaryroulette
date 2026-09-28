// 개발 모드 전용 점검 패널 (npm run dev에서만 로드됨)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { missions, journalTypeOf, type Mission } from '../../data/missions'
import { clearAllData, saveJournal, setCooldownList, setTodayMission, type JournalEntry } from '../../db/indexedDB'
import { addDays, getEffectiveDateString } from '../../lib/date'
import { drawExtraData } from '../../lib/draw'
import { joinAnswers, toAnswers } from '../../lib/prompts'

const SAMPLES: Record<string, string> = {
  'lang-2': '오늘 하루가 있었다. 피곤함이 있다. 기분이 좋지 않은 상태이다. 모든 것이 뒤엉켜 있다.',
  'lang-6': '가을이 왔다. 나는 걸었다. 바람이 불었다.',
  'lang-8': '가방 나무 다리 라면 마음 바다',
  'lang-9': '오늘은, 날씨가, 참으로 좋았다. 그래서 산책을 했다.',
  'creative-2': '뭐였을까? 그냥 피곤했다. 정말?',
  'creative-6': '엄마: "밥 먹었니?"\n나: "아직…"\n그리고 나는 부엌으로 갔다.',
  'time-3': '오늘 하루는 아침부터 저녁까지 정말 많은 일들이 있었고 그 모든 순간들이 머릿속을 가득 채우고 있어서 무척이나 복잡한 마음이다. 그래도 괜찮다.',
}

function dummyEntry(m: Mission, date: string, status: JournalEntry['status']): JournalEntry {
  const at = new Date(`${date}T21:00:00`).toISOString()
  const answers = m.prompts ? toAnswers(m.prompts, m.prompts.map((p) => `${p.label}에 대한 샘플 답`)) : null
  return {
    id: date,
    missionId: m.id,
    type: journalTypeOf(m),
    content: m.editorType === 'trash' || m.editorType === 'canvas' ? null : answers ? joinAnswers(answers) : `${m.title} 샘플 일기입니다.`,
    status,
    createdAt: at,
    completedAt: status === 'completed' ? at : null,
    extraData: answers ? { answers } : drawExtraData(m),
  }
}

export default function DevReviewPanel() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [missionId, setMissionId] = useState(missions[0].id)
  const [toast, setToast] = useState<string | null>(null)
  const today = getEffectiveDateString()

  const run = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn()
      setToast(`${label} 완료`)
    } catch (e) {
      setToast(`실패: ${String(e)}`)
    }
    setTimeout(() => setToast(null), 3000)
  }

  const selected = missions.find((m) => m.id === missionId)!

  const setToday = async (m: Mission) => {
    await setTodayMission({ key: 'todayMission', date: today, missionId: m.id, extraData: drawExtraData(m) })
  }

  const actions: Array<[string, () => Promise<void>]> = [
    ['선택한 미션을 오늘 미션으로', async () => { await setToday(selected); navigate('/'); location.reload() }],
    ['선택한 미션으로 바로 쓰기', async () => { await setToday(selected); navigate('/write'); setOpen(false) }],
    [
      '샘플 글 넣고 열기 (규칙 표시 확인)',
      async () => {
        await setToday(selected)
        const e = dummyEntry(selected, today, 'draft')
        if (SAMPLES[selected.id]) e.content = SAMPLES[selected.id]
        await saveJournal(e)
        navigate('/write')
        setOpen(false)
      },
    ],
    ['오늘 미션 지우고 다시 뽑기', async () => { await setTodayMission({ key: 'todayMission', date: '1970-01-01', missionId: missions[0].id }); navigate('/'); location.reload() }],
    ['지난 30일 완료 기록 만들기', async () => { for (let i = 1; i <= 30; i++) await saveJournal(dummyEntry(missions[(i * 7) % missions.length], addDays(today, -i), 'completed')) }],
    ['3일 전 임시저장 만들기', async () => { await saveJournal(dummyEntry(missions[3], addDays(today, -3), 'draft')) }],
    ['쉬는 미션 목록 비우기', async () => { await setCooldownList([]) }],
    ['⚠ 모든 데이터 지우기', async () => { if (confirm('정말 모두 지울까요?')) { await clearAllData(); navigate('/'); location.reload() } }],
  ]

  const box: React.CSSProperties = { background: '#1f1c19', color: '#ece5da', border: '1px solid #3c3732', borderRadius: 10, fontSize: 12 }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ ...box, position: 'fixed', right: 12, bottom: 84, zIndex: 9999, padding: '6px 10px', fontFamily: 'monospace' }}>
        DEV
      </button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...box, width: 340, maxHeight: 'calc(100vh - 24px)', overflowY: 'auto', padding: 12, display: 'grid', gap: 8 }}>
            <strong>개발용 점검 패널</strong>
            {toast && <div style={{ color: '#8fbf85' }}>{toast}</div>}
            <select value={missionId} onChange={(e) => setMissionId(e.target.value)} style={{ ...box, padding: 6, fontSize: 12 }}>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.title}
                </option>
              ))}
            </select>
            {actions.map(([label, fn]) => (
              <button key={label} type="button" onClick={() => run(label, fn)} style={{ ...box, textAlign: 'left', padding: '6px 8px', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
