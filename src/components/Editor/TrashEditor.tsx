import { useEffect, useRef, useState } from 'react'
import { Scissors, TextCursorInput } from 'lucide-react'
import type { Mission } from '../../data/missions'
import { splitGraphemes } from '../../lib/text'
import TextEditor from './TextEditor'

interface Strip {
  text: string
  id: number
  dx: number
  rot: number
  delay: number
}

/** 파쇄 애니메이션용 조각. grapheme 단위로 두 글자씩 묶어 이모지·한글이 깨지지 않게 한다. */
function toStrips(value: string): Strip[] {
  const g = splitGraphemes(value)
  const strips: Strip[] = []
  for (let i = 0; i < g.length; ) {
    let text: string
    if (g[i] === '\n') {
      text = '\n'
      i += 1
    } else {
      text = ''
      for (let n = 0; n < 2 && i < g.length && g[i] !== '\n'; n++) text += g[i++]
    }
    strips.push({
      text,
      id: strips.length,
      dx: (Math.random() - 0.5) * 240,
      rot: (Math.random() - 0.5) * 540,
      delay: Math.random() * 0.45,
    })
  }
  return strips
}

interface TrashEditorProps {
  mission: Mission
  value: string
  onChange: (value: string) => void
  onShred: () => void
}

export default function TrashEditor({ mission, value, onChange, onShred }: TrashEditorProps) {
  const [strips, setStrips] = useState<Strip[] | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const prefix = mission.sentencePrefix

  const insertPrefix = () => {
    if (!prefix) return
    const ta = textareaRef.current
    const start = ta?.selectionStart ?? value.length
    const end = ta?.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const needsBreak = before.trim() !== '' && !/[\s]$/.test(before)
    const insert = `${needsBreak ? ' ' : ''}${prefix} `
    onChange(before + insert + value.slice(end))
    const caret = start + insert.length
    // 포커스는 바로 옮겨야 곧장 이어 쓴 글자가 버튼으로 새지 않는다
    ta?.focus()
    requestAnimationFrame(() => ta?.setSelectionRange(caret, caret))
  }

  const shred = () => {
    if (!value.trim()) return
    setStrips(toStrips(value))
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    timer.current = setTimeout(onShred, reduced ? 0 : 1900)
  }

  if (strips) {
    return (
      <div className="panel relative min-h-64 overflow-hidden p-5" aria-live="polite">
        <p className="sr-only">파쇄하는 중</p>
        <div className="writing-surface !p-0 text-ink-mid" aria-hidden="true">
          {strips.map((s) =>
            s.text === '\n' ? (
              <br key={s.id} />
            ) : (
              <span
                key={s.id}
                className="inline-block whitespace-pre"
                style={
                  {
                    '--dx': `${s.dx}px`,
                    '--rot': `${s.rot}deg`,
                    animation: `shred-fall 1.4s ease-in ${s.delay}s forwards`,
                  } as React.CSSProperties
                }
              >
                {s.text}
              </span>
            ),
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-xl bg-card px-4 py-3 text-sm leading-relaxed text-ink-mid">
        이 글은 저장되지 않아요. 파쇄하면 “썼다”는 기록만 남고 내용은 사라집니다. 페이지를 떠나도 사라지니 끝까지 써 주세요.
      </p>

      <TextEditor
        mission={mission}
        value={value}
        onChange={onChange}
        textareaRef={textareaRef}
        placeholder={prefix ? `${prefix} …` : '털어놓고 싶은 이야기를 써 보세요'}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        {prefix && (
          <button type="button" onClick={insertPrefix} className="btn-secondary">
            <TextCursorInput className="h-4 w-4" />“{prefix}” 넣기
          </button>
        )}
        <button type="button" onClick={shred} disabled={!value.trim()} className="btn-primary flex-1">
          <Scissors className="h-4 w-4" />
          다 썼어요, 파쇄하기
        </button>
      </div>
    </div>
  )
}
