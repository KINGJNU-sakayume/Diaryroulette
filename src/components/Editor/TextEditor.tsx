import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Info, Lightbulb } from 'lucide-react'
import type { Mission } from '../../data/missions'
import { HEURISTIC_CHECKS, getOverLimitRange, getRuleHint, getRuleRanges, mergeRanges } from '../../lib/rules'
import { countChars, stripHangul } from '../../lib/text'
import ProgressBar from '../shared/ProgressBar'
import WritingArea from './WritingArea'

interface TextEditorProps {
  mission: Mission
  value: string
  onChange: (value: string) => void
  extraData?: Record<string, unknown>
  readOnly?: boolean
  onUserInput?: () => void
  placeholder?: string
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
  /** 에디터 위에 끼워 넣을 요소(타이머 등) */
  header?: React.ReactNode
}

export default function TextEditor({
  mission,
  value,
  onChange,
  extraData,
  readOnly,
  onUserInput,
  placeholder,
  textareaRef,
  header,
}: TextEditorProps) {
  const [peeking, setPeeking] = useState(false)
  const [koreanBlocked, setKoreanBlocked] = useState(false)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (warnTimer.current) clearTimeout(warnTimer.current)
  }, [])

  const { charLimit } = mission
  const usesLayer = Boolean(mission.check || charLimit?.max !== undefined)

  const ruleRanges = useMemo(
    () => (mission.check ? getRuleRanges(value, mission, extraData) : []),
    [value, mission, extraData],
  )
  const ranges = useMemo(() => {
    if (!usesLayer) return undefined
    const over = getOverLimitRange(value, charLimit?.max)
    return mergeRanges(over ? [...ruleRanges, over] : ruleRanges)
  }, [usesLayer, value, charLimit?.max, ruleRanges])

  const hint = mission.check ? getRuleHint(value, mission) : null
  const isHeuristic = mission.check ? HEURISTIC_CHECKS.has(mission.check) : false

  const handleFiltered = () => {
    setKoreanBlocked(true)
    if (warnTimer.current) clearTimeout(warnTimer.current)
    warnTimer.current = setTimeout(() => setKoreanBlocked(false), 2000)
  }

  const hidden = Boolean(mission.blackout) && !peeking

  return (
    <div className="flex flex-col gap-3">
      {header}

      {(hint || mission.noDelete || koreanBlocked) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {hint && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-1.5 font-medium text-ink">
              <Lightbulb className="h-4 w-4 text-accent" aria-hidden="true" />
              {hint}
            </span>
          )}
          {mission.noDelete && (
            <span className="rounded-lg bg-card px-3 py-1.5 text-ink-mid">지우기 없이 앞으로만 써요</span>
          )}
          {koreanBlocked && (
            <span role="status" className="rounded-lg bg-danger-soft px-3 py-1.5 text-danger">
              한글은 입력되지 않아요
            </span>
          )}
        </div>
      )}

      <WritingArea
        value={value}
        onChange={onChange}
        ranges={ranges}
        hidden={hidden}
        readOnly={readOnly}
        noDelete={mission.noDelete}
        filter={mission.noHangul ? stripHangul : undefined}
        onFiltered={handleFiltered}
        onUserInput={onUserInput}
        placeholder={placeholder ?? mission.placeholder ?? (mission.blackout ? '어둠 속에서 써 내려가 보세요…' : '오늘 이야기를 시작해 보세요…')}
        ariaLabel={`${mission.title} 일기`}
        textareaRef={textareaRef}
      />

      {mission.blackout && (
        <button
          type="button"
          className="btn-secondary self-start text-sm"
          onPointerDown={() => setPeeking(true)}
          onPointerUp={() => setPeeking(false)}
          onPointerLeave={() => setPeeking(false)}
          onPointerCancel={() => setPeeking(false)}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setPeeking(true)}
          onKeyUp={() => setPeeking(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Eye className="h-4 w-4" />
          꾹 눌러 보기
        </button>
      )}

      <EditorFooter
        value={value}
        charLimit={charLimit}
        violations={ruleRanges.length}
        isHeuristic={isHeuristic}
        showViolations={Boolean(mission.check) && !hidden}
      />
    </div>
  )
}

function EditorFooter({
  value,
  charLimit,
  violations,
  isHeuristic,
  showViolations,
}: {
  value: string
  charLimit?: { min?: number; max?: number }
  violations: number
  isHeuristic: boolean
  showViolations: boolean
}) {
  const count = countChars(value)
  const { min, max } = charLimit ?? {}
  const over = max !== undefined && count > max
  const under = min !== undefined && count < min
  const inRange = charLimit !== undefined && !over && !under

  let counter = `${count.toLocaleString()}자`
  if (max !== undefined) counter = `${count.toLocaleString()} / ${max.toLocaleString()}자`
  else if (min !== undefined) counter = `${count.toLocaleString()} / ${min.toLocaleString()}자`

  return (
    <div className="space-y-2">
      {min !== undefined && <ProgressBar value={count} max={min} color={under ? 'var(--color-accent)' : 'var(--color-success)'} label="글자 수" />}
      <div className="flex items-start justify-between gap-4 text-sm">
        <div className="min-w-0 text-muted">
          {showViolations && violations > 0 && (
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                밑줄 친 {violations}곳이 규칙과 달라 보여요.
                {isHeuristic && ' 자동으로 짐작한 거라 틀릴 수 있어요.'}
              </span>
            </p>
          )}
        </div>
        <span
          className={`shrink-0 tabular-nums ${over ? 'font-semibold text-danger' : inRange ? 'font-semibold text-success' : 'text-muted'}`}
          aria-live="polite"
        >
          {counter}
        </span>
      </div>
    </div>
  )
}
