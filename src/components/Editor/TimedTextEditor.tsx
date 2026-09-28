import { useCallback, useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import type { Mission } from '../../data/missions'
import ProgressBar from '../shared/ProgressBar'
import TextEditor from './TextEditor'

function formatClock(seconds: number): string {
  const s = Math.max(0, seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface TimedTextEditorProps {
  mission: Mission & { timerSeconds: number }
  value: string
  onChange: (value: string) => void
  extraData?: Record<string, unknown>
  /** 임시저장에서 복원한 경과 시간(초). 다시 들어와도 시간이 처음부터 시작되지 않는다. */
  initialElapsed: number
  onElapsedChange: (seconds: number) => void
}

/**
 * 카운트다운 글쓰기. 첫 입력에서 시작하고 시간이 끝나면 더 쓸 수 없다.
 * 시간은 시작 시각 기준으로 계산하므로 탭이 백그라운드여도 느려지지 않는다.
 */
export default function TimedTextEditor({
  mission,
  value,
  onChange,
  extraData,
  initialElapsed,
  onElapsedChange,
}: TimedTextEditorProps) {
  const total = mission.timerSeconds
  const [elapsed, setElapsed] = useState(() => Math.min(initialElapsed, total))
  const [running, setRunning] = useState(false)
  const startedAtRef = useRef<number | null>(null)
  const onElapsedRef = useRef(onElapsedChange)
  useEffect(() => {
    onElapsedRef.current = onElapsedChange
  }, [onElapsedChange])

  const timeUp = elapsed >= total

  const start = useCallback(() => {
    if (startedAtRef.current !== null || timeUp) return
    startedAtRef.current = Date.now() - elapsed * 1000
    setRunning(true)
  }, [elapsed, timeUp])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const next = Math.min(total, Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000))
      setElapsed(next)
      onElapsedRef.current(next)
      if (next >= total) {
        clearInterval(id)
        setRunning(false)
      }
    }, 250)
    return () => clearInterval(id)
  }, [running, total])

  const remaining = total - elapsed
  const urgent = running && remaining <= 10

  let status = '첫 글자를 쓰면 시작해요'
  if (timeUp) status = '시간이 다 됐어요. 완료를 눌러 저장하세요.'
  else if (running) status = '멈추지 말고 계속 써요'
  else if (elapsed > 0) status = '이어서 쓰면 남은 시간부터 다시 가요'

  const header = (
    <div className="panel px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Timer className={`h-5 w-5 ${urgent || timeUp ? 'text-danger' : 'text-accent'}`} aria-hidden="true" />
          <span
            className={`font-mono text-2xl font-bold tabular-nums ${urgent || timeUp ? 'text-danger' : 'text-ink'}`}
            role="timer"
            aria-label={`남은 시간 ${formatClock(remaining)}`}
          >
            {formatClock(remaining)}
          </span>
        </div>
        <span className="text-right text-sm text-muted">{status}</span>
      </div>
      <ProgressBar value={remaining} max={total} color={urgent || timeUp ? 'var(--color-danger)' : 'var(--color-accent)'} label="남은 시간" />
    </div>
  )

  return (
    <TextEditor
      mission={mission}
      value={value}
      onChange={onChange}
      extraData={extraData}
      readOnly={timeUp}
      onUserInput={start}
      header={header}
      placeholder="첫 글자를 쓰는 순간 타이머가 시작돼요…"
    />
  )
}
