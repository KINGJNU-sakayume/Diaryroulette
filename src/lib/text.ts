// 글자 수·이모지 처리 도우미.

const segmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined'
    ? new Intl.Segmenter('ko', { granularity: 'grapheme' })
    : null

/** 사용자가 "한 글자"로 인식하는 단위(grapheme)로 나눈다. */
export function splitGraphemes(str: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(str), (s) => s.segment)
  return Array.from(str)
}

/**
 * 글자 수(공백 포함). 이모지 한 개가 2자로 세어지지 않도록 grapheme 기준으로 센다.
 */
export function countChars(str: string): number {
  return splitGraphemes(str).length
}

/** n번째 글자(grapheme)가 시작하는 UTF-16 인덱스. n이 글자 수 이상이면 str.length. */
export function graphemeOffsetToIndex(str: string, n: number): number {
  if (n <= 0) return 0
  let index = 0
  let count = 0
  for (const g of splitGraphemes(str)) {
    if (count === n) return index
    index += g.length
    count += 1
  }
  return str.length
}

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u
const FLAG = /^\p{Regional_Indicator}{2}$/u
const KEYCAP = /^[0-9#*]️?⃣$/u
const WHITESPACE = /^\s+$/u

/** 한 grapheme이 이모지인지. 숫자·#·* 같은 "이모지 구성 문자" 단독은 제외한다. */
export function isEmojiGrapheme(seg: string): boolean {
  return PICTOGRAPHIC.test(seg) || FLAG.test(seg) || KEYCAP.test(seg)
}

/** 이모지와 공백만 남긴다. 합성 이모지(가족, 국기, 피부색 등)는 한 덩어리로 보존. */
export function keepOnlyEmoji(str: string): string {
  return splitGraphemes(str)
    .filter((seg) => isEmojiGrapheme(seg) || WHITESPACE.test(seg))
    .join('')
}

export function countEmoji(str: string): number {
  return splitGraphemes(str).filter(isEmojiGrapheme).length
}

const HANGUL_ANY = /[가-힣ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿]/g

export function stripHangul(str: string): string {
  return str.replace(HANGUL_ANY, '')
}
