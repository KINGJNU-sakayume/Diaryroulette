import { useState, useEffect, useRef, useCallback } from 'react'
import { Timer, EyeOff, Eye } from 'lucide-react'
import TextEditor from './TextEditor'
import ProgressBar from '../shared/ProgressBar'
import { type Mission } from '../../data/missions'

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60)
  const s = Math.abs(seconds) % 60
  const sign = seconds < 0 ? '-' : ''
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TimedTextEditorProps {
  value: string
  onChange: (val: string) => void
  mission: Mission
  extraData?: Record<string, unknown>
}

export default function TimedTextEditor({
  value,
  onChange,
  mission,
  extraData,
}: TimedTextEditorProps) {
  const isBlackout = mission.id === 'time-6'
  const timerSeconds = mission.timerSeconds ?? null
  const isCountdown = timerSeconds !== null
  const charMin = mission.charLimit?.min ?? null
  const backspaceDisabled = mission.backspaceDisabled ?? false

  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [revealed, setRevealed] = useState(false) // blackout reveal state
  const [celebrated, setCelebrated] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start timer on first keystroke
  const startTimer = useCallback(() => {
    if (started) return
    setStarted(true)
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
  }, [started])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const timeRemaining = isCountdown ? (timerSeconds ?? 0) - elapsed : elapsed
  const isTimeUp = isCountdown && elapsed >= (timerSeconds ?? 0)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (backspaceDisabled && e.key === 'Backspace') {
        e.preventDefault()
        return
      }
      startTimer()
    },
    [backspaceDisabled, startTimer],
  )

  const handleChange = useCallback(
    (val: string) => {
      if (!started) startTimer()
      if (charMin && val.length >= charMin) {
        setCelebrated(true)
      }
      onChange(val)
    },
    [started, startTimer, onChange, charMin],
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Timer display — hidden when showTimer is false */}
      {mission.showTimer !== false && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border${isBlackout && !revealed ? ' relative z-50' : ''}`}
          style={{ background: '#161b22', borderColor: '#30363d' }}
        >
          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 text-amber-400" />
            <span
              className="text-2xl font-mono font-bold tabular-nums"
              style={{
                color: isTimeUp ? '#ef4444' : isCountdown && timeRemaining < 10 ? '#f97316' : '#e6edf3',
              }}
            >
              {formatTime(timeRemaining)}
            </span>
            {!started && (
              <span className="text-xs text-slate-500">첫 타이핑 시 시작됩니다</span>
            )}
            {isTimeUp && <span className="text-xs text-red-400 animate-pulse">시간 종료!</span>}
          </div>
        </div>
      )}

      {/* Blackout toggle — standalone row, visible even when timer is hidden */}
      {isBlackout && (
        <div className="flex justify-end relative z-50">
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: '#30363d', color: '#8b949e', background: '#21262d' }}
          >
            {revealed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {revealed ? '가리기' : '미리보기'}
          </button>
        </div>
      )}

      {/* charMin progress bar */}
      {charMin && (
        <div>
          <ProgressBar
            value={value.length}
            max={charMin}
            color={celebrated ? '#65a30d' : '#d97706'}
            height={6}
            label={celebrated ? '🎉 목표 달성!' : `목표: ${charMin}자`}
            showText
          />
          {backspaceDisabled && (
            <p className="text-xs text-slate-500 mt-1">⚠️ 백스페이스 사용 불가</p>
          )}
        </div>
      )}

      {/* Blackout overlay — pointer-events-none so typing and button clicks pass through */}
      {isBlackout && !revealed && (
        <div className="fixed inset-0 z-40 pointer-events-none" style={{ background: 'rgba(0,0,0,0.97)' }}>
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            <p className="text-slate-600 text-sm">어둠 속에서 써 내려가세요…</p>
          </div>
        </div>
      )}

      {/* Editor — forceInvisible hides text during blackout while keeping caret visible */}
      <div>
        <TextEditor
          value={value}
          onChange={handleChange}
          missionId={mission.id}
          extraData={extraData}
          charLimit={mission.charLimit}
          onKeyDown={handleKeyDown}
          forceInvisible={isBlackout && !revealed}
          placeholder={
            isBlackout
              ? '어둠 속에서 자유롭게 써 보세요. 저장하면 내용이 드러납니다…'
              : '타이핑을 시작하면 타이머가 시작됩니다…'
          }
        />
      </div>
    </div>
  )
}
