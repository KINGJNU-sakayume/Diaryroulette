import { useCallback, useLayoutEffect, useRef } from 'react'
import type { PromptField } from '../../data/missions'

interface PromptsEditorProps {
  fields: PromptField[]
  values: string[]
  onChange: (values: string[]) => void
}

/** 정해진 칸을 하나씩 채우는 양식 일기 */
export default function PromptsEditor({ fields, values, onChange }: PromptsEditorProps) {
  const refs = useRef<Array<HTMLTextAreaElement | null>>([])
  const filled = values.filter((v) => v.trim()).length

  const update = (index: number, value: string) => {
    const next = [...values]
    next[index] = value
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted" aria-live="polite">
        {filled === fields.length ? '모든 칸을 채웠어요' : `${fields.length}칸 중 ${filled}칸 채움`}
      </p>
      {fields.map((field, i) => (
        <PromptBox
          key={field.label}
          index={i}
          field={field}
          value={values[i] ?? ''}
          onChange={(v) => update(i, v)}
          inputRef={(el) => (refs.current[i] = el)}
          onEnterNext={() => refs.current[i + 1]?.focus()}
        />
      ))}
    </div>
  )
}

function PromptBox({
  index,
  field,
  value,
  onChange,
  inputRef,
  onEnterNext,
}: {
  index: number
  field: PromptField
  value: string
  onChange: (value: string) => void
  inputRef: (el: HTMLTextAreaElement | null) => void
  onEnterNext: () => void
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const minHeight = field.short ? 52 : 108

  const resize = useCallback(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(ta.scrollHeight + 2, minHeight)}px`
  }, [minHeight])

  useLayoutEffect(resize, [value, resize])

  const id = `prompt-${index}`
  return (
    <div className="panel p-4">
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-[11px] text-ink-mid">{index + 1}</span>
        {field.label}
      </label>
      <textarea
        id={id}
        ref={(el) => {
          ref.current = el
          inputRef(el)
        }}
        value={value}
        onChange={(e) => onChange(field.short ? e.target.value.replace(/\n/g, ' ') : e.target.value)}
        onKeyDown={(e) => {
          if (field.short && e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            onEnterNext()
          }
        }}
        enterKeyHint={field.short ? 'next' : 'enter'}
        placeholder={field.placeholder}
        rows={1}
        spellCheck={false}
        className="block w-full resize-none overflow-hidden rounded-lg border border-line bg-page px-3 py-2.5 font-serif text-base leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent"
        style={{ minHeight }}
      />
    </div>
  )
}
