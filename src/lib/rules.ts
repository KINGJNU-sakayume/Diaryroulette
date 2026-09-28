// 미션별 규칙 검사. 글자 위치(UTF-16 인덱스) 구간을 돌려주면 에디터가 밑줄을 그린다.
// 형태소 분석기 없이 동작하는 검사(no-noun, no-copula, no-modifier, third-person)는
// 어디까지나 짐작이라서 화면에도 "틀릴 수 있다"고 안내한다.

import type { CheckId, Mission } from '../data/missions'
import {
  BASIC_CONSONANTS,
  getBasicChoseong,
  getJungseong,
  isHangulSyllable,
  vowelFamily,
} from './hangul'
import { countChars, graphemeOffsetToIndex } from './text'

export interface Range {
  start: number
  end: number
}

export const HEURISTIC_CHECKS = new Set<CheckId>(['no-noun', 'no-copula', 'no-modifier', 'third-person'])

// ─── 토큰 나누기 ──────────────────────────────────────────────────────────────

interface Token extends Range {
  text: string
}

/** 띄어쓰기 단위(어절) */
export function splitWords(text: string): Token[] {
  const out: Token[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] })
  }
  return out
}

export interface Sentence extends Range {
  /** 문장부호나 줄바꿈으로 끝났는지(아직 쓰는 중이면 false) */
  terminated: boolean
  terminator: string
}

/**
 * 문장 나누기. 마침표 하나·물음표·느낌표·줄바꿈이 경계.
 * 말줄임표(... 또는 …)는 문장 중간에 흔히 쓰이므로 경계로 보지 않는다.
 */
export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const isBoundary =
      ch === '\n' || ch === '?' || ch === '!' || (ch === '.' && text[i - 1] !== '.' && text[i + 1] !== '.')
    if (isBoundary) {
      out.push({ start, end: i, terminated: true, terminator: ch })
      start = i + 1
    }
  }
  if (start < text.length) out.push({ start, end: text.length, terminated: false, terminator: '' })
  return out
}

const LETTER = /[\p{L}\p{N}]/u

/** 앞뒤 문장부호를 떼어 낸 어절 핵심 */
function coreOf(word: Token): Token {
  const leading = word.text.match(/^[^\p{L}\p{N}]*/u)?.[0].length ?? 0
  const trailing = word.text.match(/[^\p{L}\p{N}]*$/u)?.[0].length ?? 0
  const end = Math.max(leading, word.text.length - trailing)
  return { start: word.start + leading, end: word.start + end, text: word.text.slice(leading, end) }
}

// ─── 개별 검사 ────────────────────────────────────────────────────────────────

function checkBannedVowel(text: string, vowel: string): Range[] {
  const banned = new Set(vowelFamily(vowel))
  const out: Range[] = []
  for (let i = 0; i < text.length; i++) {
    const v = getJungseong(text[i])
    if (v && banned.has(v)) out.push({ start: i, end: i + 1 })
  }
  return out
}

function checkSingleVowel(text: string, vowel: string): Range[] {
  const out: Range[] = []
  for (let i = 0; i < text.length; i++) {
    const v = getJungseong(text[i])
    if (v && v !== vowel) out.push({ start: i, end: i + 1 })
  }
  return out
}

function firstHangulIndex(text: string, from: number, to: number): number {
  for (let i = from; i < to; i++) if (isHangulSyllable(text[i])) return i
  return -1
}

function wordEndFrom(text: string, from: number, limit: number): number {
  let i = from
  while (i < limit && !/\s/.test(text[i])) i++
  return i
}

function checkSentenceChoseong(text: string): Range[] {
  const out: Range[] = []
  let order = 0
  for (const s of splitSentences(text)) {
    const first = firstHangulIndex(text, s.start, s.end)
    if (first === -1) continue
    const expected = BASIC_CONSONANTS[order % BASIC_CONSONANTS.length]
    order++
    if (getBasicChoseong(text[first]) !== expected) {
      out.push({ start: first, end: wordEndFrom(text, first, s.end) })
    }
  }
  return out
}

/** 가나다 단어 일기에서 "단어"로 세는 어절: 문장부호를 떼고 한글로 시작하는 것 */
function choseongWords(text: string): Token[] {
  return splitWords(text)
    .map(coreOf)
    .filter((w) => isHangulSyllable(w.text[0]))
}

function checkWordChoseong(text: string): Range[] {
  const out: Range[] = []
  choseongWords(text).forEach((w, i) => {
    const expected = BASIC_CONSONANTS[i % BASIC_CONSONANTS.length]
    if (getBasicChoseong(w.text[0]) !== expected) out.push({ start: w.start, end: w.end })
  })
  return out
}

function checkThreeSyllables(text: string): Range[] {
  const out: Range[] = []
  for (const w of splitWords(text)) {
    const letters = Array.from(w.text).filter((ch) => LETTER.test(ch)).length
    if (letters > 0 && letters !== 3) out.push({ start: w.start, end: w.end })
  }
  return out
}

function checkQuestionsOnly(text: string): Range[] {
  const out: Range[] = []
  for (const s of splitSentences(text)) {
    if (!s.terminated || s.terminator === '?') continue
    const body = text.slice(s.start, s.end)
    if (!LETTER.test(body)) continue
    const lead = body.length - body.trimStart().length
    out.push({ start: s.start + lead, end: s.terminator === '\n' ? s.end : s.end + 1 })
  }
  return out
}

function checkSentencePrefix(text: string, prefix: string): Range[] {
  const out: Range[] = []
  const compact = (s: string) => s.replace(/\s+/g, '')
  const target = compact(prefix)
  for (const s of splitSentences(text)) {
    const body = text.slice(s.start, s.end)
    if (!LETTER.test(body)) continue
    const lead = body.length - body.trimStart().length
    const head = compact(body.replace(/^[\s"'“‘(]+/, ''))
    if (head.startsWith(target)) continue
    // 아직 쓰는 중인 마지막 문장은 접두어를 입력하는 도중일 수 있다
    if (!s.terminated && target.startsWith(head)) continue
    out.push({ start: s.start + lead, end: s.end })
  }
  return out
}

const QUOTE_PAIRS: Record<string, string> = { '"': '"', '“': '”', '‘': '’', '「': '」', '『': '』', "'": "'" }

function checkDialogueOnly(text: string): Range[] {
  const out: Range[] = []
  let closing: string | null = null
  let runStart = -1
  let runHasLetter = false
  const flush = (end: number) => {
    if (runStart !== -1 && runHasLetter) {
      const slice = text.slice(runStart, end)
      const lead = slice.length - slice.trimStart().length
      const trail = slice.length - slice.trimEnd().length
      out.push({ start: runStart + lead, end: end - trail })
    }
    runStart = -1
    runHasLetter = false
  }

  let lineStart = true
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    // 줄 맨 앞의 "엄마:" 같은 화자 표시는 허용
    if (lineStart && closing === null) {
      const label = text.slice(i).match(/^[ \t]*[^"“”‘’'「」『』:：\n]{1,12}[:：]/)
      if (label) {
        i += label[0].length - 1
        lineStart = false
        continue
      }
    }
    lineStart = ch === '\n'

    if (closing !== null) {
      if (ch === closing) closing = null
      continue
    }
    // 영어 축약(don't)의 아포스트로피는 따옴표로 보지 않는다
    const isApostrophe = ch === "'" && LETTER.test(text[i - 1] ?? '') && LETTER.test(text[i + 1] ?? '')
    if (ch in QUOTE_PAIRS && !isApostrophe) {
      flush(i)
      closing = QUOTE_PAIRS[ch]
      continue
    }
    if (ch === '\n') {
      flush(i)
      continue
    }
    if (runStart === -1) runStart = i
    if (LETTER.test(ch)) runHasLetter = true
  }
  flush(text.length)
  return out
}

// ── 짐작형 검사 ──

const COPULA_END =
  /(이다|이야|이에요|이예요|예요|입니다|입니까|이죠|이지|이네|인데|일까|이라서|이라고|이라|이니까|이니|이면|이며|이고|이지만|이겠다|이겠지|(?:이었|였)(?:다|고|어|어요|어서|는데|지만|습니다|을까|던|으면|으니|죠|네))$/

function checkNoCopula(text: string): Range[] {
  const out: Range[] = []
  for (const w of splitWords(text)) {
    const core = coreOf(w)
    if (!core.text) continue
    if (/[있없]/.test(core.text) || COPULA_END.test(core.text)) out.push({ start: core.start, end: core.end })
  }
  return out
}

const ADVERBS = new Set([
  '매우', '아주', '너무', '정말', '진짜', '참', '꽤', '상당히', '굉장히', '엄청', '되게', '조금', '좀', '약간',
  '많이', '빨리', '천천히', '갑자기', '드디어', '결국', '이미', '벌써', '아직', '항상', '늘', '자주', '가끔',
  '거의', '모두', '다', '함께', '같이', '혼자', '다시', '또', '곧', '잘', '못', '더', '덜', '가장', '제일',
  '푹', '꼭', '계속', '그냥', '살짝', '문득', '괜히', '딱', '막', '마침', '겨우', '오래', '일찍', '늦게',
  '열심히', '조용히', '편히', '깊이', '높이', '멀리', '가까이', '특히', '별로', '전혀', '아마', '분명',
  '없이', '굳이', '깨끗이', '곰곰이', '틈틈이', '일일이', '나란히', '가만히', '빨리빨리', '어서', '이제',
])

const ADJECTIVE_PATTERNS = [
  // 형용사를 만드는 접미사: 사랑스럽다, 자유롭다, 아름다운
  /[가-힣](스럽|스러|스레|로운|로워|로웠|롭다|롭고|롭게|다운|다워|다웠|답다|답게)/,
  // 흔한 '-하다' 형용사
  /^(피곤|행복|따뜻|시원|조용|심심|지루|편안|불편|깨끗|이상|친절|소중|궁금|답답|섭섭|미안|속상|우울|불안|초조|뿌듯|든든|차분|느긋|한가|복잡|건강|똑똑|착|솔직|포근|쓸쓸|허전|막막|멍|상쾌|개운|찝찝|평온|무난|유쾌|씁쓸|달콤|새콤|짭짤)(하|해|했|한|할|히)/,
  // 흔한 형용사 활용형
  /^(좋|나쁘|나빴|나쁜|예쁘|예뻤|예쁜|슬프|슬펐|슬픈|기쁘|기뻤|기쁜|아프|아팠|아픈|바쁘|바빴|바쁜|춥|추웠|추운|덥|더웠|더운|즐겁|즐거|외롭|외로|괜찮|귀엽|귀여|무섭|무서|새롭|새로|어둡|어두|밝|무겁|무거|가볍|가벼|힘들|힘든|힘드|배고프|배고팠|배고픈|졸리|졸렸|졸린|많|적었|작|길었|짧)(다|고|아|어|았|었|게|지|은|네|아서|어서|으면|을|는데|던|았던|었던|음|기)?$/,
]

function checkNoModifier(text: string): Range[] {
  const out: Range[] = []
  for (const w of splitWords(text)) {
    const core = coreOf(w)
    const t = core.text
    if (!t || !isHangulSyllable(t[0])) continue
    const bare = t.replace(/(도|은|는|만)$/, '')
    const flagged =
      ADVERBS.has(t) ||
      ADVERBS.has(bare) ||
      (t.length >= 2 && /히$/.test(t)) ||
      (t.length >= 2 && /게$/.test(t) && !/(에게|^내게|^네게|^제게|^가게|^무게)$/.test(t)) ||
      ADJECTIVE_PATTERNS.some((re) => re.test(t))
    if (flagged && !/^좋아(하|해|했)/.test(t)) out.push({ start: core.start, end: core.end })
  }
  return out
}

const COMMON_NOUNS = new Set([
  '나', '너', '저', '우리', '저희', '그', '그녀', '오늘', '어제', '내일', '아침', '점심', '저녁', '밤', '새벽',
  '집', '방', '회사', '학교', '친구', '엄마', '아빠', '가족', '사람', '시간', '하루', '일', '밥', '커피',
  '날씨', '비', '눈', '잠', '길', '버스', '지하철', '휴대폰', '핸드폰', '책', '영화', '음악', '마음', '생각',
  '기분', '몸', '머리', '손', '발', '물', '차', '돈', '카페', '식당', '회의', '수업', '숙제', '운동', '산책',
])

const NOUN_PARTICLE =
  /^(.+?)(이|가|을|를|의|에|에서|에게|께|께서|한테|으로|로|과|와|이랑|랑|처럼|까지|부터|이나|나|은|는|도|만)$/

/** 명사 뒤에 붙었다고 비교적 확신할 수 있는 조사. '-은/-는/-을/-도'는 동사 활용과 겹쳐서 뺐다. */
const CLEAR_PARTICLES = new Set(['이', '가', '를', '의', '에서', '에게', '께서', '한테', '이랑', '랑', '처럼', '까지', '부터'])
/** 받침 있는 말 뒤에만 붙는 조사 / 받침 없는 말 뒤에만 붙는 조사 */
const AFTER_BATCHIM = new Set(['이', '이랑'])
const AFTER_VOWEL = new Set(['가', '를', '랑'])

function hasBatchim(ch: string): boolean {
  return isHangulSyllable(ch) && (ch.charCodeAt(0) - 0xac00) % 28 !== 0
}

function checkNoNoun(text: string): Range[] {
  const out: Range[] = []
  for (const w of splitWords(text)) {
    const core = coreOf(w)
    const t = core.text
    if (!t || !isHangulSyllable(t[0]) || ADVERBS.has(t)) continue
    let flagged = COMMON_NOUNS.has(t)
    const m = flagged ? null : t.match(NOUN_PARTICLE)
    if (m) {
      const [, stem, particle] = m
      const last = stem[stem.length - 1]
      if (COMMON_NOUNS.has(stem)) {
        flagged = true
      } else if (CLEAR_PARTICLES.has(particle)) {
        flagged =
          (!AFTER_BATCHIM.has(particle) || hasBatchim(last)) &&
          (!AFTER_VOWEL.has(particle) || !hasBatchim(last))
      }
    }
    if (flagged) out.push({ start: core.start, end: core.end })
  }
  return out
}

const FIRST_PERSON = /^(나|내|저|제|우리|저희)(는|가|를|을|의|도|만|에게|한테|랑|하고|와|과|께|로서|로|야|요|들|들은|들이|들을|들의|게|네)?$/

function checkThirdPerson(text: string): Range[] {
  const out: Range[] = []
  for (const w of splitWords(text)) {
    const core = coreOf(w)
    if (FIRST_PERSON.test(core.text)) out.push({ start: core.start, end: core.end })
  }
  return out
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

export function getRuleRanges(text: string, mission: Mission, extra?: Record<string, unknown>): Range[] {
  if (!text) return []
  switch (mission.check) {
    case 'banned-vowel':
      return typeof extra?.bannedVowel === 'string' ? checkBannedVowel(text, extra.bannedVowel) : []
    case 'single-vowel':
      return typeof extra?.allowedVowel === 'string' ? checkSingleVowel(text, extra.allowedVowel) : []
    case 'sentence-choseong':
      return checkSentenceChoseong(text)
    case 'word-choseong':
      return checkWordChoseong(text)
    case 'three-syllables':
      return checkThreeSyllables(text)
    case 'questions-only':
      return checkQuestionsOnly(text)
    case 'sentence-prefix':
      return mission.sentencePrefix ? checkSentencePrefix(text, mission.sentencePrefix) : []
    case 'dialogue-only':
      return checkDialogueOnly(text)
    case 'no-copula':
      return checkNoCopula(text)
    case 'no-modifier':
      return checkNoModifier(text)
    case 'no-noun':
      return checkNoNoun(text)
    case 'third-person':
      return checkThirdPerson(text)
    default:
      return []
  }
}

/** 최대 글자 수를 넘긴 부분 */
export function getOverLimitRange(text: string, max: number | undefined): Range | null {
  if (max === undefined || countChars(text) <= max) return null
  return { start: graphemeOffsetToIndex(text, max), end: text.length }
}

/** 겹치거나 맞닿은 구간을 합친다 */
export function mergeRanges(ranges: Range[]): Range[] {
  const sorted = ranges.filter((r) => r.end > r.start).sort((a, b) => a.start - b.start)
  const out: Range[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end)
    else out.push({ ...r })
  }
  return out
}

/** 에디터 위에 띄울 짧은 안내 (예: 이번 문장은 ㄷ으로 시작해요) */
export function getRuleHint(text: string, mission: Mission): string | null {
  if (mission.check === 'sentence-choseong') {
    let done = 0
    for (const s of splitSentences(text)) {
      if (s.terminated && firstHangulIndex(text, s.start, s.end) !== -1) done++
    }
    return `이번 문장은 ‘${BASIC_CONSONANTS[done % BASIC_CONSONANTS.length]}’으로 시작해요`
  }
  if (mission.check === 'word-choseong') {
    const words = choseongWords(text)
    const typingWord = text.length > 0 && !/\s$/.test(text) && words.length > 0 && words[words.length - 1].end === text.length
    const index = typingWord ? words.length - 1 : words.length
    const label = typingWord ? '지금 단어' : '다음 단어'
    return `${label}는 ‘${BASIC_CONSONANTS[index % BASIC_CONSONANTS.length]}’으로 시작해요`
  }
  return null
}
