import { useState, useCallback, useRef } from 'react'

interface EmojiEditorProps {
  value: string
  onChange: (val: string) => void
}

// Common emoji groups
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: '감정',
    emojis: ['😀', '😂', '😅', '😊', '😌', '😔', '😞', '😢', '😭', '😤', '😡', '🥺', '😳', '😵', '😶', '🤔', '😴', '🥱', '😇', '🥰', '😍', '🤩', '🙄', '🥳'],
  },
  {
    label: '신체',
    emojis: ['👋', '🤝', '👍', '👎', '✌️', '🤞', '🤗', '❤️', '💔', '💪', '🦾', '🦵', '👁️', '👂', '💓', '🧠'],
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

/**
 * 입력에서 이모지가 아닌 문자를 제거한다. 단 공백과 개행은 가독성을 위해 보존.
 *
 * 이전 구현(`/\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}(?:\p{Emoji_Modifier})?/gu`)은
 * ZWJ(Zero-Width Joiner) 시퀀스를 처리하지 못해 👨‍👩‍👧(가족), 🏳️‍🌈(프라이드),
 * 🧑‍🏫(교사) 같은 합성 이모지를 부분 이모지로 쪼개는 문제가 있었다.
 *
 * Intl.Segmenter는 grapheme(사용자가 한 문자로 인식하는 단위) 경계를 정확히 파악하므로,
 * ZWJ로 이어진 복합 이모지도 하나의 segment로 반환된다. 각 segment에 이모지 코드포인트가
 * 포함되어 있는지만 검사하면 ZWJ 시퀀스가 자연스럽게 보존된다.
 */
function filterInput(str: string): string {
  // Intl.Segmenter가 지원되지 않는 아주 오래된 환경 대비 fallback
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter === 'undefined') {
    return str
  }
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const emojiTest = /\p{Extended_Pictographic}|\p{Emoji_Component}/u
  const whitespace = /^\s+$/
  const result: string[] = []
  for (const { segment } of segmenter.segment(str)) {
    if (emojiTest.test(segment) || whitespace.test(segment)) {
      result.push(segment)
    }
  }
  return result.join('')
}

function countEmojis(str: string): number {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter === 'undefined') {
    return str.length
  }
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const emojiTest = /\p{Extended_Pictographic}/u
  let count = 0
  for (const { segment } of segmenter.segment(str)) {
    if (emojiTest.test(segment)) count++
  }
  return count
}

export default function EmojiEditor({ value, onChange }: EmojiEditorProps) {
  const [activeGroup, setActiveGroup] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(filterInput(e.target.value))
    },
    [onChange],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 제어/탐색 키 허용
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter']
    if (allowed.includes(e.key)) return
    // 공백도 허용 (이모지 사이 가독성)
    if (e.key === ' ') return
    // 일반 텍스트 입력 차단 (ASCII 문자/숫자/기호)
    // 이모지는 e.key가 2자 이상이거나 BMP 밖 코드포인트라 length > 1인 경우가 많아 통과.
    // onChange에서 filterInput이 한 번 더 방어.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      if (e.key.charCodeAt(0) < 128) {
        e.preventDefault()
      }
    }
  }, [])

  const addEmoji = useCallback(
    (emoji: string) => {
      const start = textareaRef.current?.selectionStart ?? value.length
      const end = textareaRef.current?.selectionEnd ?? value.length
      const newValue = value.slice(0, start) + emoji + value.slice(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const pos = start + [...emoji].length
          textareaRef.current.selectionStart = pos
          textareaRef.current.selectionEnd = pos
        }
      })
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
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
          fontFamily: 'inherit',
        }}
      />

      <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
        {countEmojis(value)}개의 이모티콘
      </p>

      {/* Emoji picker */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Group tabs */}
        <div className="flex overflow-x-auto border-b" style={{ borderColor: 'var(--color-border)' }}>
          {EMOJI_GROUPS.map((group, i) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(i)}
              className="px-3 py-2 text-xs whitespace-nowrap transition-colors shrink-0"
              style={{
                color: activeGroup === i ? 'var(--color-text)' : 'var(--color-muted)',
                borderBottom: activeGroup === i ? '2px solid #7c3aed' : '2px solid transparent',
                background: activeGroup === i ? 'var(--color-card)' : 'transparent',
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
