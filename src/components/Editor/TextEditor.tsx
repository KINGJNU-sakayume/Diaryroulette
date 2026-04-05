import { useState, useRef, useCallback, useMemo } from 'react'
import ProgressBar from '../shared/ProgressBar'

// ─── Korean syllable helpers ──────────────────────────────────────────────────

const KOREAN_VOWEL_NAMES = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const KOREAN_CONSONANTS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

// Adverbs to highlight for lang-5 (adjectives/adverbs must not be used)
const LANG5_ADVERBS = ['매우', '아주', '너무', '정말', '참', '꽤', '상당히', '굉장히', '엄청', '조금', '약간', '많이', '빨리', '천천히', '갑자기', '드디어', '결국', '이미', '아직', '항상', '자주', '가끔', '거의', '모두', '함께', '혼자']

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

function getChoseong(char: string): string | null {
  const code = char.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return null
  const idx = Math.floor((code - 0xac00) / 28 / 21)
  return KOREAN_CONSONANTS[idx] ?? null
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
  } else if (missionId === 'lang-1') {
    // Highlight probable nouns (red — player must NOT use nouns)
    let m: RegExpExecArray | null
    // Pattern: Korean word + noun particle → likely a noun+particle unit
    const particlePattern = /([가-힣]+)(이|가|을|를|은|는|의|에서|에게|으로|로|과|와|도)(?=[\s\n]|$|[^가-힣])/g
    while ((m = particlePattern.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, color: '#ff4d4d' })
    }
    // Standalone Korean word (2+ chars) not ending in verb/adj suffixes
    const verbAdjEndings = /[다고서며어아면니지게도록라기음자]$/
    const wordPattern = /[가-힣]{2,}/g
    while ((m = wordPattern.exec(text)) !== null) {
      if (!verbAdjEndings.test(m[0])) {
        const alreadyCovered = ranges.some(r => r.start <= m!.index && r.end > m!.index)
        if (!alreadyCovered) {
          ranges.push({ start: m.index, end: m.index + m[0].length, color: '#ff4d4d' })
        }
      }
    }
  } else if (missionId === 'lang-5') {
    // Highlight probable adjectives and adverbs (red — player must NOT use these)
    let m: RegExpExecArray | null
    // Hardcoded adverb blocklist
    for (const adv of LANG5_ADVERBS) {
      const re = new RegExp(adv, 'g')
      while ((m = re.exec(text)) !== null) {
        ranges.push({ start: m.index, end: m.index + m[0].length, color: '#ff4d4d' })
      }
    }
    // Adjectival endings: 하다/롭다/스럽다/답다/없다 conjugations
    const adjPattern = /[가-힣]*(하|롭|스럽|답|없)(다|고|어|아|지만|는데|으면|으니|었|겠|게|워|여)/g
    while ((m = adjPattern.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, color: '#ff4d4d' })
    }
    // Adverb endings ~히, ~게 (preceded by Korean chars, followed by space/end/non-Korean)
    const advEndingPattern = /[가-힣]+(히|게)(?=[\s\n]|$|[^가-힣])/g
    while ((m = advEndingPattern.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, color: '#ff4d4d' })
    }
  } else if (missionId === 'time-5' || missionId === 'lang-6') {
    // Highlight sentences whose first Korean syllable doesn't match expected consonant order
    const sentences: { start: number; end: number }[] = []
    const terminatorPattern = /[.?!\n]/g
    let m: RegExpExecArray | null
    let lastEnd = 0
    while ((m = terminatorPattern.exec(text)) !== null) {
      if (m.index > lastEnd) {
        sentences.push({ start: lastEnd, end: m.index })
      }
      lastEnd = m.index + 1
    }
    if (lastEnd < text.length) {
      sentences.push({ start: lastEnd, end: text.length })
    }
    sentences.forEach((sentence, idx) => {
      const rawSentence = text.slice(sentence.start, sentence.end)
      const leadingWhitespace = rawSentence.length - rawSentence.trimStart().length
      const actualStart = sentence.start + leadingWhitespace
      // Find first Korean syllable in this sentence
      let firstKoreanIdx = -1
      for (let i = actualStart; i < sentence.end; i++) {
        if (getChoseong(text[i]) !== null) {
          firstKoreanIdx = i
          break
        }
      }
      if (firstKoreanIdx === -1) return
      const expected = KOREAN_CONSONANTS[idx % KOREAN_CONSONANTS.length]
      const actual = getChoseong(text[firstKoreanIdx])
      if (actual !== expected) {
        // Highlight from sentence start to end of first word
        let wordEnd = firstKoreanIdx + 1
        while (wordEnd < sentence.end && !/\s/.test(text[wordEnd])) wordEnd++
        ranges.push({ start: actualStart, end: wordEnd, color: '#ff4d4d' })
      }
    })
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
  forceInvisible?: boolean
}

// ─── Missions that need soft highlighting ─────────────────────────────────────

const HIGHLIGHT_MISSIONS = new Set(['lang-1', 'lang-2', 'lang-3', 'lang-4', 'lang-5', 'lang-6', 'time-3', 'time-5'])

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
  forceInvisible = false,
}: TextEditorProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const needsHighlight = HIGHLIGHT_MISSIONS.has(missionId)
  const [koreanWarning, setKoreanWarning] = useState(false)

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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value
    if (missionId === 'lang-7') {
      const filtered = val.replace(/[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]/g, '')
      if (filtered !== val) {
        setKoreanWarning(true)
        setTimeout(() => setKoreanWarning(false), 2000)
      }
      val = filtered
    }
    onChange(val)
  }, [missionId, onChange])

  // Next expected consonant for time-5/lang-6 hint
  const nextConsonant = useMemo(() => {
    if (missionId !== 'time-5' && missionId !== 'lang-6') return ''
    const completedSentences = (value.match(/[.?!\n]/g) || []).length
    return KOREAN_CONSONANTS[completedSentences % KOREAN_CONSONANTS.length]
  }, [value, missionId])

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

      {/* Consonant order hint for time-5/lang-6 */}
      {(missionId === 'time-5' || missionId === 'lang-6') && (
        <div className="text-xs text-blue-400 bg-blue-900/20 border border-blue-800/40 rounded-lg px-3 py-2">
          다음 문장은 &apos;{nextConsonant}&apos;으로 시작해야 합니다
        </div>
      )}

      {/* Korean input warning for lang-7 */}
      {koreanWarning && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
          한국어는 사용할 수 없습니다 / Korean is not allowed
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
              color: '#e6edf3',
              zIndex: 3,
            }}
            dangerouslySetInnerHTML={{ __html: highlightedHTML || escapeHTML(value) }}
          />
        )}

        <textarea
          value={value}
          onChange={handleChange}
          onScroll={needsHighlight ? syncOverlayScroll : undefined}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          className="w-full min-h-64 p-4 rounded-xl border text-sm leading-relaxed resize-y outline-none transition-colors"
          style={{
            background: '#161b22',
            borderColor: isOverMax ? '#ef4444' : '#30363d',
            color: (forceInvisible || needsHighlight) ? 'transparent' : '#e6edf3',
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
