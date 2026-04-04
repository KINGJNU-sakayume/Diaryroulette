import { useState, useCallback, useRef } from 'react'

interface EmojiEditorProps {
  value: string
  onChange: (val: string) => void
}

// Common emoji groups
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: '감정',
    emojis: ['😀', '😂', '🥲', '😊', '😌', '😔', '😞', '😢', '😭', '😤', '😡', '🥺', '😳', '🫠', '😶', '🤔', '😴', '🥱', '😇', '🥰', '😍', '🤩', '🫡', '🥳'],
  },
  {
    label: '신체',
    emojis: ['👋', '🤝', '👍', '👎', '✌️', '🤞', '🫶', '❤️', '💔', '💪', '🦾', '🦵', '👁️', '👂', '🫀', '🧠'],
  },
  {
    label: '자연',
    emojis: ['🌸', '🌿', '🍂', '🌊', '🌙', '☀️', '⛅', '🌧️', '⛈️', '❄️', '🌈', '🌺', '🌻', '🍀', '🌾', '🌴'],
  },
  {
    label: '음식',
    emojis: ['🍎', '🍊', '🍋', '☕', '🍵', '🍜', '🍕', '🍰', '🍫', '🥗', '🍷', '🥂', '🍺', '🧁', '🍣', '🥘'],
  },
  {
    label: '활동',
    emojis: ['🏃', '🚶', '🧘', '💃', '🕺', '🏋️', '🤸', '🛌', '✍️', '📖', '🎵', '🎨', '🎮', '🏊', '🚴', '🧹'],
  },
  {
    label: '사물',
    emojis: ['📱', '💻', '📚', '✏️', '🔑', '💡', '🕯️', '⏰', '📷', '🎁', '🏠', '🚗', '✈️', '🚂', '⚡', '🔮'],
  },
  {
    label: '기타',
    emojis: ['❓', '❗', '💭', '💬', '🔥', '💫', '⭐', '✨', '🌀', '🔴', '🟡', '🟢', '🔵', '⬛', '🟥', '🟨'],
  },
]

// Strip non-emoji characters from input
function filterEmoji(str: string): string {
  // Regex matches emoji sequences (including ZWJ sequences, modifiers, etc.)
  const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}(?:\p{Emoji_Modifier})?|\p{Emoji_Component}+/gu
  return (str.match(emojiRegex) ?? []).join('')
}

export default function EmojiEditor({ value, onChange }: EmojiEditorProps) {
  const [activeGroup, setActiveGroup] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(filterEmoji(e.target.value))
    },
    [onChange],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow: Backspace, Delete, Arrow keys, Tab
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab']
    if (allowed.includes(e.key)) return
    // Block regular text input (will be filtered via onChange anyway, but prevents flash)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Allow if it could be an emoji (non-ASCII)
      if (e.key.charCodeAt(0) < 128) {
        e.preventDefault()
      }
    }
  }, [])

  const addEmoji = useCallback(
    (emoji: string) => {
      onChange(value + emoji)
      textareaRef.current?.focus()
    },
    [value, onChange],
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Display area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="이모티콘을 선택하거나 직접 입력하세요 🎭"
        className="w-full min-h-32 p-4 rounded-xl border text-3xl leading-loose resize-none outline-none"
        style={{
          background: '#161b22',
          borderColor: '#30363d',
          color: '#e6edf3',
          fontFamily: 'inherit',
        }}
      />

      <p className="text-xs text-slate-500 text-center">
        {value.length}개의 이모티콘
      </p>

      {/* Emoji picker */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: '#161b22', borderColor: '#30363d' }}
      >
        {/* Group tabs */}
        <div className="flex overflow-x-auto border-b" style={{ borderColor: '#30363d' }}>
          {EMOJI_GROUPS.map((group, i) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(i)}
              className="px-3 py-2 text-xs whitespace-nowrap transition-colors shrink-0"
              style={{
                color: activeGroup === i ? '#e6edf3' : '#8b949e',
                borderBottom: activeGroup === i ? '2px solid #7c3aed' : '2px solid transparent',
                background: activeGroup === i ? '#21262d' : 'transparent',
              }}
            >
              {group.label}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="p-3 grid grid-cols-8 gap-1">
          {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="text-2xl p-1.5 rounded-lg hover:bg-white/10 transition-colors text-center"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
