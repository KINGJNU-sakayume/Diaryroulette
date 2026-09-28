// 한글 음절(가–힣) 분해 도우미.
// 음절 코드 = 0xAC00 + (초성 * 21 + 중성) * 28 + 종성

const SYLLABLE_START = 0xac00
const SYLLABLE_END = 0xd7a3

/** 유니코드 초성 순서(19자). 인덱스가 음절 코드 계산과 그대로 대응한다. */
export const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

/** 유니코드 중성 순서(21자). */
export const JUNGSEONG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ',
  'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const

/** 가나다 순서 미션에서 쓰는 기본 자음 14자. */
export const BASIC_CONSONANTS = [
  'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

const TENSE_TO_BASIC: Record<string, string> = {
  'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ',
}

/** 룰렛에서 뽑을 수 있는 모음. 겹모음·드문 모음은 난이도가 들쭉날쭉해서 제외. */
export const DRAWABLE_VOWELS = ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ'] as const

/**
 * 기본 모음이 "들어 있는" 겹모음까지 포함한 목록.
 * 예: ㅗ를 금지하면 과(ㅘ)·왜(ㅙ)·외(ㅚ)도 함께 금지된다.
 */
const VOWEL_FAMILY: Record<string, string[]> = {
  'ㅏ': ['ㅏ', 'ㅘ'],
  'ㅓ': ['ㅓ', 'ㅝ'],
  'ㅗ': ['ㅗ', 'ㅘ', 'ㅙ', 'ㅚ'],
  'ㅜ': ['ㅜ', 'ㅝ', 'ㅞ', 'ㅟ'],
  'ㅡ': ['ㅡ', 'ㅢ'],
  'ㅣ': ['ㅣ'],
}

export function isHangulSyllable(ch: string | undefined): boolean {
  if (!ch) return false
  const code = ch.charCodeAt(0)
  return code >= SYLLABLE_START && code <= SYLLABLE_END
}

export function getChoseong(ch: string | undefined): string | null {
  if (!ch || !isHangulSyllable(ch)) return null
  const idx = Math.floor((ch.charCodeAt(0) - SYLLABLE_START) / (21 * 28))
  return CHOSEONG[idx] ?? null
}

/** 된소리(ㄲ·ㄸ·ㅃ·ㅆ·ㅉ)를 기본 자음으로 접은 초성. */
export function getBasicChoseong(ch: string | undefined): string | null {
  const cho = getChoseong(ch)
  if (!cho) return null
  return TENSE_TO_BASIC[cho] ?? cho
}

export function getJungseong(ch: string | undefined): string | null {
  if (!ch || !isHangulSyllable(ch)) return null
  const idx = Math.floor((ch.charCodeAt(0) - SYLLABLE_START) / 28) % 21
  return JUNGSEONG[idx] ?? null
}

/** 금지 모음 v가 적용되는 모든 중성. 목록에 없는 모음은 자기 자신만. */
export function vowelFamily(v: string): string[] {
  return VOWEL_FAMILY[v] ?? [v]
}
