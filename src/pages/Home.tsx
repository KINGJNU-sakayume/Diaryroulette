import { useState, useCallback, useEffect } from 'react'
import { RotateCw } from 'lucide-react'
import SlotMachinePicker from '../components/SlotMachine/SlotMachinePicker'
import MissionCard from '../components/Roulette/MissionCard'
import { useTodayMission, getLocalDateString } from '../hooks/useTodayMission'
import { getJournal } from '../db/indexedDB'

export default function Home() {
  const { todayRecord, mission, loading, drawMission } = useTodayMission()
  const [isSpinning, setIsSpinning] = useState(false)
  const [todayJournalStatus, setTodayJournalStatus] = useState<'completed' | 'draft' | null>(null)

  useEffect(() => {
    const today = getLocalDateString()
    getJournal(today).then((entry) => {
      setTodayJournalStatus(entry?.status ?? null)
    })
  }, [])

  const handleSpin = useCallback(async () => {
    if (isSpinning || todayRecord) return
    setIsSpinning(true)
    await drawMission()
    // onSpinComplete will be called by the wheel animation
  }, [isSpinning, todayRecord, drawMission])

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false)
  }, [])

  const targetMissionId = todayRecord?.missionId ?? null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-sm animate-pulse" style={{ color: 'var(--color-muted)' }}>로딩 중…</div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-serif mb-2" style={{ color: 'var(--color-text)' }}>
            오늘의 글쓰기 미션
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {todayRecord
              ? '오늘의 미션이 정해졌습니다'
              : '룰렛을 돌려 오늘의 제약을 받아보세요'}
          </p>
        </div>

        {/* Roulette wheel */}
        <div className="flex flex-col items-center gap-6">
          <SlotMachinePicker
            targetMissionId={targetMissionId}
            isSpinning={isSpinning}
            onSpinComplete={handleSpinComplete}
          />

          {!todayRecord && !isSpinning && (
            <button
              onClick={handleSpin}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', color: '#fff' }}
            >
              <RotateCw className="w-5 h-5" />
              룰렛 돌리기
            </button>
          )}

          {isSpinning && (
            <div className="text-sm animate-pulse" style={{ color: 'var(--color-text-mid)' }}>
              미션을 추첨하는 중…
            </div>
          )}
        </div>

        {/* Mission card — shown after spin or if already drawn today */}
        {mission && todayRecord && !isSpinning && (
          <div className="w-full animate-fadeIn">
            <MissionCard
              mission={mission}
              extraData={todayRecord.extraData}
              isCompleted={todayJournalStatus === 'completed'}
            />
          </div>
        )}

      </div>
    </div>
  )
}
