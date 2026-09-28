import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { Range } from '../../lib/rules'

interface WritingAreaProps {
  value: string
  onChange: (value: string) => void
  /** 밑줄로 표시할 구간. undefined면 표시 레이어를 아예 쓰지 않는다. */
  ranges?: Range[]
  placeholder?: string
  readOnly?: boolean
  /** 글자를 가린다(보이지 않게 쓰기) */
  hidden?: boolean
  /** 백스페이스·삭제·잘라내기 금지 */
  noDelete?: boolean
  /** 입력값 변환(예: 한글 제거). 값이 바뀌면 onFiltered가 불린다. */
  filter?: (value: string) => string
  onFiltered?: () => void
  /** 사용자가 입력할 때마다(붙여넣기·IME 포함) */
  onUserInput?: () => void
  minHeight?: number
  ariaLabel: string
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
  autoFocus?: boolean
}

/**
 * 글쓰기 칸. 내용에 맞춰 높이가 늘어나고(내부 스크롤 없음), 규칙 위반 구간은
 * 같은 글꼴·줄바꿈을 쓰는 뒤쪽 레이어에 밑줄로 그린다.
 */
export default function WritingArea({
  value,
  onChange,
  ranges,
  placeholder,
  readOnly = false,
  hidden = false,
  noDelete = false,
  filter,
  onFiltered,
  onUserInput,
  minHeight = 260,
  ariaLabel,
  textareaRef,
  autoFocus,
}: WritingAreaProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const composingRef = useRef(false)

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      innerRef.current = el
      if (textareaRef) textareaRef.current = el
    },
    [textareaRef],
  )

  const resize = useCallback(() => {
    const ta = innerRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(ta.scrollHeight + 2, minHeight)}px`
  }, [minHeight])

  useLayoutEffect(resize, [value, resize])

  useEffect(() => {
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  // 지우기 금지: 모바일 가상 키보드는 keydown에 Backspace를 싣지 않는 경우가 많아서
  // beforeinput(inputType: delete*)을 막는 것이 가장 확실하다. 한글 조합 중 수정은 허용.
  useEffect(() => {
    const ta = innerRef.current
    if (!ta || !noDelete) return
    const onBeforeInput = (e: InputEvent) => {
      if (!e.isComposing && e.inputType.startsWith('delete')) e.preventDefault()
    }
    ta.addEventListener('beforeinput', onBeforeInput)
    return () => ta.removeEventListener('beforeinput', onBeforeInput)
  }, [noDelete])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value
    const composing = composingRef.current || (e.nativeEvent as InputEvent).isComposing
    // beforeinput을 못 막는 환경을 위한 마지막 방어선: 조합 중이 아닌데 글이 줄면 무시
    if (noDelete && !composing && raw.length < value.length) return
    const next = filter ? filter(raw) : raw
    if (next !== raw) onFiltered?.()
    onChange(next)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (noDelete && !e.nativeEvent.isComposing && (e.key === 'Backspace' || e.key === 'Delete')) e.preventDefault()
  }

  const showLayer = ranges !== undefined && !hidden

  return (
    // 배경은 바깥 상자가 칠하고 textarea는 투명하게 둔다 → 뒤쪽 밑줄 레이어가 비쳐 보인다
    <div className={`relative rounded-xl ${hidden ? '' : 'bg-surface'}`} style={hidden ? { background: '#15130f' } : undefined}>
      {showLayer && (
        <div
          aria-hidden="true"
          className="writing-surface pointer-events-none absolute inset-0 overflow-hidden rounded-xl border border-transparent text-ink"
        >
          {renderMarked(value, ranges)}
          {/* 마지막 줄이 빈 줄이어도 높이가 맞도록 */}
          {'​'}
        </div>
      )}
      <textarea
        ref={setRefs}
        value={value}
        onChange={handleChange}
        onKeyDown={noDelete ? handleKeyDown : undefined}
        onCut={noDelete ? (e) => e.preventDefault() : undefined}
        onInput={onUserInput}
        onCompositionStart={() => (composingRef.current = true)}
        onCompositionEnd={() => (composingRef.current = false)}
        readOnly={readOnly}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        spellCheck={false}
        rows={1}
        className={`writing-surface relative block w-full resize-none overflow-hidden rounded-xl border bg-transparent outline-none transition-colors focus:border-accent ${
          hidden ? 'border-transparent placeholder:text-[#6f665d]' : 'border-line placeholder:text-muted'
        } ${readOnly ? 'cursor-default' : ''}`}
        style={{
          minHeight,
          color: showLayer || hidden ? 'transparent' : 'var(--color-text)',
          caretColor: hidden ? '#b3a99d' : 'var(--color-text)',
        }}
      />
    </div>
  )
}

function renderMarked(text: string, ranges: Range[] | undefined): React.ReactNode[] {
  if (!ranges || ranges.length === 0) return [text]
  const out: React.ReactNode[] = []
  let cursor = 0
  ranges.forEach((r, i) => {
    if (r.start > cursor) out.push(text.slice(cursor, r.start))
    out.push(
      <mark key={i} className="rule-miss">
        {text.slice(r.start, r.end)}
      </mark>,
    )
    cursor = r.end
  })
  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}
