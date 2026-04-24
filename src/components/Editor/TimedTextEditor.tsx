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
  onTimerReady?: (canComplete: boolean) => void
}

export default function TimedTextEditor({
  value,
  onChange,
  mission,
  extraData,
  onTimerReady,
}: TimedTextEditorProps) {
  const isBlackout = mission.id === 'time-5'
  const timerSeconds = mission.timerSeconds ?? null
  const isCountdown = timerSeconds !== null
  const charMin = mission.charLimit?.min ?? null
  const backspaceDisabled = mission.backspaceDisabled ?? false

  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [revealed, setRevealed] = useState(false) // blackout reveal state
  const [celebrated, setCelebrated] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start timer on first input event.
  // onKeyDown만 감지하면 붙여넣기/드래그앤드롭/IME 완료/모바일 자동완성 탭으로
  // 타이머를 우회할 수 있으므로, 모든 value 변경을 포착하는 onInput으로 트리거한다.
  const startTimer = useCallback(() => {
    if (started) return
    setStarted(true)
    onTimerReady?.(true)
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
  }, [started, onTimerReady])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const timeRemaining = isCountdown ? (timerSeconds ?? 0) - elapsed : elapsed
  const isTimeUp = isCountdown && elapsed >= (timerSeconds ?? 0)

  // Stop interval when time is up
  useEffect(() => {
    if (isTimeUp && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isTimeUp])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (backspaceDisabled && e.key === 'Backspace') {
        e.preventDefault()
        return
      }
      // 타이머 시작은 onInput에서 담당. 여기서는 백스페이스 차단만.
    },
    [backspaceDisabled],
  )

  const handleInput = useCallback(() => {
    startTimer()
  }, [startTimer])

  const handleChange = useCallback(
    (val: string) => {
      // celebrated는 가역적으로 — 목표 달성 후 삭제하면 다시 아래로 내려감.
      if (charMin) {
        setCelebrated(val.length >= charMin)
      }
      onChange(val)
    },
    [onChange, charMin],
  )

  return (
    // relative 컨테이너 — 블랙아웃 오버레이가 이 영역만 덮도록 스코프 한정.
    // 이전에는 fixed inset-0로 헤더/탭바까지 가려 탈출구가 사라지는 문제가 있었다.
    <div className="flex flex-col gap-4 relative">
      {/* Timer display — hidden when showTimer is false */}
      {mission.showTimer !== false && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border${isBlackout && !revealed ? ' relative z-50' : ''}`}
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 text-amber-400" />
            <span
              className="text-2xl font-mono font-bold tabular-nums"
              style={{
                color: isTimeUp
                  ? '#ef4444'
                  : isCountdown && timeRemaining < 10
                  ? '#f97316'
                  : 'var(--color-text)',
              }}
            >
              {formatTime(timeRemaining)}
            </span>
            {!started && (
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                첫 타이핑 시 시작됩니다
              </span>
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
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-muted)',
              background: 'var(--color-card)',
            }}
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
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              ⚠️ 백스페이스 사용 불가
            </p>
          )}
        </div>
      )}

      {/* Blackout overlay — absolute(에디터 컨테이너 기준)로 스코프 한정.
          헤더/탭바는 덮지 않아 사용자가 언제든 화면을 벗어날 수 있다.
          pointer-events-none으로 에디터 상호작용은 그대로 통과된다. */}
      {isBlackout && !revealed && (
        <div
          className="absolute inset-0 z-40 pointer-events-none rounded-xl"
          style={{ background: 'rgba(0,0,0,0.97)' }}
        >
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
          onInput={handleInput}
          readOnly={isTimeUp}
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
