import { useRef, useCallback, useMemo } from 'react'
import ProgressBar from '../shared/ProgressBar'

// ─── Korean syllable helpers ──────────────────────────────────────────────────

const KOREAN_VOWEL_NAMES = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']

function buildVowelSyllableSet(vowelChar: string): Set<string> {
  const vowelIndex = KOREAN_VOWEL_NAMES.indexOf(vowelChar)
  if (vowelIndex === -1) return new Set()
  const set = new Set<string>()
  // Korean syllables: 0xAC00 + (initial * 21 + vowel) * 28 + final
  for (let initial = 0; initial < 19; initial++) {
    for (let final = 0; final < 28; final++) {
      const code = 0xac00 + (initial * 21 + vowelIndex) * 28 + final
      set.add(String.fromCharCode(code))
    }
  }
  return set
}

// ─── Highlight logic ──────────────────────────────────────────────────────────

type HighlightRange = { start: number; end: number; color: string }

function getHighlights(
  text: string,
  missionId: string,
  extraData?: Record<string, unknown>,
  charLimit?: { min?: number; max?: number },
): HighlightRange[] {
  const ranges: HighlightRange[] = []

  if (missionId === 'lang-2') {
    // Highlight 이다/있다/없다 conjugations
    const pattern = /[이있없](다|고|어|어서|지만|는데|으면|으니|었|겠)/g
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, color: '#ff4d4d' })
    }
  } else if (missionId === 'lang-3' && extraData?.bannedVowel) {
    const bannedSet = buildVowelSyllableSet(String(extraData.bannedVowel))
    for (let i = 0; i < text.length; i++) {
      if (bannedSet.has(text[i])) {
        ranges.push({ start: i, end: i + 1, color: '#ff4d4d' })
      }
    }
  } else if (missionId === 'lang-4' && extraData?.allowedVowel) {
    const allowedVowelIdx = KOREAN_VOWEL_NAMES.indexOf(String(extraData.allowedVowel))
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      if (code >= 0xac00 && code <= 0xd7a3) {
        const jungseong = Math.floor((code - 0xac00) / 28) % 21
        if (jungseong !== allowedVowelIdx) {
          ranges.push({ start: i, end: i + 1, color: '#ff4d4d' })
        }
      }
    }
  }

  // time-3: highlight chars beyond max limit
  if (charLimit?.max && text.length > charLimit.max) {
    ranges.push({ start: charLimit.max, end: text.length, color: '#ef4444' })
  }

  return ranges
}

// Merge overlapping ranges and render highlighted HTML
function renderHighlightedHTML(text: string, ranges: HighlightRange[]): string {
  if (ranges.length === 0) {
    return escapeHTML(text)
  }

  // Build per-character color map
  const colorMap: Array<string | null> = new Array(text.length).fill(null)
  for (const { start, end, color } of ranges) {
    for (let i = start; i < Math.min(end, text.length); i++) {
      colorMap[i] = color
    }
  }

  let html = ''
  let i = 0
  while (i < text.length) {
    const color = colorMap[i]
    if (color) {
      let j = i
      while (j < text.length && colorMap[j] === color) j++
      html += `<mark style="background:${color}33;border-bottom:2px solid ${color};border-radius:2px;color:inherit">${escapeHTML(text.slice(i, j))}</mark>`
      i = j
    } else {
      let j = i
      while (j < text.length && !colorMap[j]) j++
      html += escapeHTML(text.slice(i, j))
      i = j
    }
  }

  return html
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/ /g, '&nbsp;')
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TextEditorProps {
  value: string
  onChange: (val: string) => void
  missionId: string
  extraData?: Record<string, unknown>
  charLimit?: { min?: number; max?: number }
  placeholder?: string
  readOnly?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

// ─── Missions that need soft highlighting ─────────────────────────────────────

const HIGHLIGHT_MISSIONS = new Set(['lang-2', 'lang-3', 'lang-4', 'time-3'])

// ─── Component ────────────────────────────────────────────────────────────────

export default function TextEditor({
  value,
  onChange,
  missionId,
  extraData,
  charLimit,
  placeholder = '오늘의 이야기를 시작하세요…',
  readOnly = false,
  onKeyDown,
}: TextEditorProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const needsHighlight = HIGHLIGHT_MISSIONS.has(missionId)

  const highlights = useMemo(() => {
    if (!needsHighlight) return []
    return getHighlights(value, missionId, extraData, charLimit)
  }, [value, missionId, extraData, charLimit, needsHighlight])

  const highlightedHTML = useMemo(() => {
    if (!needsHighlight || highlights.length === 0) return ''
    return renderHighlightedHTML(value, highlights)
  }, [value, highlights, needsHighlight])

  const syncOverlayScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop
      overlayRef.current.scrollLeft = (e.target as HTMLTextAreaElement).scrollLeft
    }
  }, [])

  const charCount = value.length
  const isOverMax = charLimit?.max !== undefined && charCount > charLimit.max
  const isUnderMin = charLimit?.min !== undefined && charCount < charLimit.min
  const showProgress = charLimit?.min !== undefined || charLimit?.max !== undefined

  return (
    <div className="flex flex-col gap-3">
      {/* Hint banner for highlighted missions */}
      {needsHighlight && (
        <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2">
          💡 참고용 힌트입니다 — 절대적 기준이 아닙니다
        </div>
      )}

      {/* Editor area */}
      <div className="relative">
        {/* Highlight overlay (only when needed) */}
        {needsHighlight && (
          <div
            ref={overlayRef}
            aria-hidden="true"
            className="absolute inset-0 p-4 pointer-events-none overflow-hidden whitespace-pre-wrap break-words text-sm leading-relaxed rounded-xl"
            style={{
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              lineHeight: '1.625',
              color: 'transparent',
              zIndex: 1,
            }}
            dangerouslySetInnerHTML={{ __html: highlightedHTML || escapeHTML(value) }}
          />
        )}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={needsHighlight ? syncOverlayScroll : undefined}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          className="w-full min-h-64 p-4 rounded-xl border text-sm leading-relaxed resize-y outline-none transition-colors"
          style={{
            background: '#161b22',
            borderColor: isOverMax ? '#ef4444' : '#30363d',
            color: needsHighlight ? 'transparent' : '#e6edf3',
            caretColor: '#e6edf3',
            fontFamily: 'inherit',
            position: 'relative',
            zIndex: 2,
          }}
          spellCheck={false}
        />
      </div>

      {/* Char counter + progress */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          {showProgress && charLimit?.min && (
            <ProgressBar
              value={charCount}
              max={charLimit.min}
              color={isUnderMin ? '#d97706' : '#65a30d'}
              height={4}
            />
          )}
        </div>
        <span
          className="text-xs shrink-0"
          style={{ color: isOverMax ? '#ef4444' : '#8b949e' }}
        >
          {charCount}
          {charLimit?.max && ` / ${charLimit.max}`}
          {!charLimit?.max && charLimit?.min && ` / ${charLimit.min} 목표`}
          자
        </span>
      </div>
    </div>
  )
}
