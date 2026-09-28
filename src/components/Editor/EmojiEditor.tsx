import { useRef, useState } from 'react'
import { Delete } from 'lucide-react'
import { countEmoji, keepOnlyEmoji, splitGraphemes } from '../../lib/text'

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: '기분', emojis: ['😀', '😂', '😅', '😊', '😌', '🥰', '😍', '🤩', '🥳', '😇', '🤔', '😶', '😐', '🙄', '😴', '🥱', '😔', '😞', '😢', '😭', '😤', '😡', '😳', '🥺', '😵', '🤯', '🫠', '😮‍💨'] },
  { label: '사람', emojis: ['🙋', '🙆', '🙅', '🤷', '🙇', '👋', '🤝', '👍', '👎', '👏', '🙏', '💪', '👀', '🧠', '❤️', '💔', '💕', '🫶', '👨‍👩‍👧', '🧑‍💻', '🧑‍🍳', '🧑‍🎓', '🧑‍🏫', '🧑‍⚕️'] },
  { label: '날씨', emojis: ['☀️', '🌤️', '⛅', '☁️', '🌧️', '⛈️', '🌩️', '❄️', '🌨️', '🌬️', '🌫️', '🌈', '🌙', '⭐', '🌊', '🔥'] },
  { label: '음식', emojis: ['☕', '🍵', '🧋', '🍺', '🍷', '🍚', '🍜', '🍝', '🍕', '🍔', '🍣', '🥗', '🍰', '🍫', '🍩', '🍎', '🍓', '🍌', '🥐', '🍳'] },
  { label: '활동', emojis: ['🏃', '🚶', '🧘', '🏋️', '🚴', '🏊', '💃', '🛌', '🛁', '✍️', '📖', '🎧', '🎮', '🎨', '🎬', '🛒', '🧹', '💼', '📚', '💻'] },
  { label: '장소', emojis: ['🏠', '🏢', '🏫', '🏥', '⛪', '🏞️', '🏖️', '🌃', '🚌', '🚇', '🚗', '🚲', '✈️', '🚆', '🗺️', '📍'] },
  { label: '물건', emojis: ['📱', '💻', '⌚', '📷', '🔑', '💡', '🕯️', '⏰', '🎁', '💌', '📦', '💰', '💊', '🧸', '🪴', '🌸'] },
  { label: '기호', emojis: ['❓', '❗', '‼️', '💭', '💬', '💤', '💫', '✨', '🎵', '➡️', '🔁', '⏳', '✅', '❌', '⭕', '💯'] },
]

interface EmojiEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function EmojiEditor({ value, onChange }: EmojiEditorProps) {
  const [group, setGroup] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insert = (emoji: string) => {
    const ta = textareaRef.current
    const start = ta?.selectionStart ?? value.length
    const end = ta?.selectionEnd ?? value.length
    onChange(value.slice(0, start) + emoji + value.slice(end))
    // selectionStart는 UTF-16 단위라서 이모지 길이도 같은 단위(emoji.length)로 더한다
    const caret = start + emoji.length
    requestAnimationFrame(() => {
      if (!ta) return
      ta.setSelectionRange(caret, caret)
    })
  }

  const removeLast = () => {
    const parts = splitGraphemes(value)
    parts.pop()
    onChange(parts.join(''))
  }

  const count = countEmoji(value)

  return (
    <div className="flex flex-col gap-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(keepOnlyEmoji(e.target.value))}
        placeholder="아래에서 고르거나 휴대폰 이모지 키보드로 입력하세요"
        aria-label="이모지 일기"
        rows={4}
        className="w-full resize-y rounded-xl border border-line bg-surface p-4 leading-relaxed text-ink outline-none placeholder:text-base placeholder:text-muted focus:border-accent"
        style={{ fontSize: 30 }}
      />

      <div className="flex items-center justify-between text-sm text-muted">
        <span aria-live="polite">이모지 {count}개</span>
        <button type="button" onClick={removeLast} disabled={!value} className="btn-ghost px-3 py-1.5 text-sm">
          <Delete className="h-4 w-4" />
          하나 지우기
        </button>
      </div>

      <div className="panel overflow-hidden">
        <div role="tablist" aria-label="이모지 묶음" className="flex overflow-x-auto border-b border-line">
          {EMOJI_GROUPS.map((g, i) => (
            <button
              key={g.label}
              type="button"
              role="tab"
              aria-selected={group === i}
              onClick={() => setGroup(i)}
              className={`shrink-0 px-4 py-2.5 text-sm transition-colors ${
                group === i ? 'border-b-2 border-accent font-semibold text-ink' : 'border-b-2 border-transparent text-muted'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-1 p-2 sm:grid-cols-10">
          {EMOJI_GROUPS[group].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insert(emoji)}
              className="aspect-square rounded-lg text-2xl transition-colors hover:bg-card"
              aria-label={`${emoji} 넣기`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
