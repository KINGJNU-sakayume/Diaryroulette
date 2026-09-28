import { describe, it, expect } from 'vitest'
import { getMission, type Mission } from '../data/missions'
import { getBasicChoseong, getChoseong, getJungseong } from '../lib/hangul'
import {
  getOverLimitRange,
  getRuleHint,
  getRuleRanges,
  mergeRanges,
  splitSentences,
} from '../lib/rules'

const m = (id: string): Mission => {
  const mission = getMission(id)
  if (!mission) throw new Error(`missing mission ${id}`)
  return mission
}

/** 표시된 구간의 글자들 */
const flagged = (text: string, id: string, extra?: Record<string, unknown>) =>
  getRuleRanges(text, m(id), extra).map((r) => text.slice(r.start, r.end))

describe('hangul helpers', () => {
  it('초성을 19자 순서 그대로 돌려준다 (예전 14자 매핑 버그 회귀 방지)', () => {
    expect(getChoseong('가')).toBe('ㄱ')
    expect(getChoseong('나')).toBe('ㄴ')
    expect(getChoseong('다')).toBe('ㄷ')
    expect(getChoseong('하')).toBe('ㅎ')
    expect(getChoseong('까')).toBe('ㄲ')
  })

  it('된소리는 기본 자음으로 접는다', () => {
    expect(getBasicChoseong('까')).toBe('ㄱ')
    expect(getBasicChoseong('쌀')).toBe('ㅅ')
    expect(getBasicChoseong('A')).toBeNull()
  })

  it('중성을 구한다', () => {
    expect(getJungseong('과')).toBe('ㅘ')
    expect(getJungseong('의')).toBe('ㅢ')
  })
})

describe('splitSentences', () => {
  it('마침표·물음표·느낌표·줄바꿈에서 나눈다', () => {
    const s = splitSentences('가. 나? 다!\n라')
    expect(s.map((x) => x.terminated)).toEqual([true, true, true, true, false])
  })

  it('말줄임표는 문장 경계로 보지 않는다', () => {
    expect(splitSentences('왜인지... 모르겠다.')).toHaveLength(1)
    expect(splitSentences('왜인지… 모르겠다.')).toHaveLength(1)
  })
})

describe('sentence-choseong (lang-6)', () => {
  it('ㄱ→ㄴ→ㄷ 순서를 지키면 표시가 없다', () => {
    expect(flagged('가을이 왔다. 나는 걸었다. 다리가 아팠다.', 'lang-6')).toEqual([])
  })

  it('순서가 틀린 문장의 첫 단어만 표시한다', () => {
    expect(flagged('가을이 왔다. 다리가 아팠다.', 'lang-6')).toEqual(['다리가'])
  })

  it('된소리로 시작해도 기본 자음으로 인정한다', () => {
    expect(flagged('까치가 울었다. 나도 울었다.', 'lang-6')).toEqual([])
  })

  it('다음 문장 자음을 안내한다', () => {
    expect(getRuleHint('가을이 왔다. ', m('lang-6'))).toContain('ㄴ')
  })
})

describe('word-choseong (lang-8)', () => {
  it('단어마다 순서를 따진다', () => {
    expect(flagged('가방 나무 다리', 'lang-8')).toEqual([])
    expect(flagged('나는 가고', 'lang-8')).toEqual(['나는', '가고'])
  })

  it('문장부호는 떼고 판단한다', () => {
    expect(flagged('"가방, 나무."', 'lang-8')).toEqual([])
  })

  it('쓰는 중인 단어와 다음 단어를 구분해 안내한다', () => {
    expect(getRuleHint('가방', m('lang-8'))).toBe('지금 단어는 ‘ㄱ’으로 시작해요')
    expect(getRuleHint('가방 ', m('lang-8'))).toBe('다음 단어는 ‘ㄴ’으로 시작해요')
  })
})

describe('three-syllables (lang-9)', () => {
  it('문장부호는 글자 수에서 뺀다 (설명 속 예문이 통과해야 한다)', () => {
    expect(flagged('오늘은, 날씨가, 참으로 좋았다.', 'lang-9')).toEqual([])
  })

  it('세 글자가 아닌 어절을 표시한다', () => {
    expect(flagged('오늘 날씨가 좋았습니다', 'lang-9')).toEqual(['오늘', '좋았습니다'])
  })
})

describe('banned / single vowel (lang-3, lang-4)', () => {
  it('금지 모음과 그 겹모음을 표시한다', () => {
    expect(flagged('과자 오이 우유', 'lang-3', { bannedVowel: 'ㅗ' })).toEqual(['과', '오'])
  })

  it('허용 모음이 아닌 음절을 표시한다', () => {
    expect(flagged('바다 가자 너', 'lang-4', { allowedVowel: 'ㅏ' })).toEqual(['너'])
  })

  it('추첨값이 없으면 아무것도 표시하지 않는다', () => {
    expect(flagged('아무거나', 'lang-3')).toEqual([])
  })
})

describe('no-copula (lang-2)', () => {
  it('있다·없다의 모든 활용형을 잡는다', () => {
    expect(flagged('집에 있는 시간 없어서 재미있었다', 'lang-2')).toEqual(['있는', '없어서', '재미있었다'])
  })

  it('이다 활용형을 잡는다', () => {
    expect(flagged('나는 학생입니다. 친구였다.', 'lang-2')).toEqual(['학생입니다', '친구였다'])
  })

  it('이야기처럼 이다와 무관한 말은 표시하지 않는다', () => {
    expect(flagged('이야기를 들었다', 'lang-2')).toEqual([])
  })
})

describe('questions-only (creative-2)', () => {
  it('물음표로 끝나지 않은 문장만 표시한다', () => {
    expect(flagged('뭐였을까? 그냥 피곤했다. 정말?', 'creative-2')).toEqual(['그냥 피곤했다.'])
  })

  it('쓰는 중인 마지막 문장과 빈 줄은 표시하지 않는다', () => {
    expect(flagged('뭐였을까?\n\n그래서', 'creative-2')).toEqual([])
  })
})

describe('sentence-prefix (creative-8)', () => {
  it('정해진 말로 시작하지 않은 문장을 표시한다', () => {
    expect(flagged('왜인지 모르겠지만 웃었다. 그리고 울었다.', 'creative-8')).toEqual(['그리고 울었다'])
  })

  it('말줄임표가 붙어도 인정한다', () => {
    expect(flagged('왜인지 모르겠지만… 배가 고팠다.', 'creative-8')).toEqual([])
  })

  it('접두어를 입력하는 도중에는 표시하지 않는다', () => {
    expect(flagged('왜인지 모르', 'creative-8')).toEqual([])
  })
})

describe('dialogue-only (creative-6)', () => {
  it('따옴표 밖의 서술을 표시한다', () => {
    expect(flagged('"안녕?" 그가 말했다.', 'creative-6')).toEqual(['그가 말했다.'])
  })

  it('화자 표시와 여러 줄 대화는 허용한다', () => {
    expect(flagged('엄마: "밥 먹었니?"\n나: “아직…”', 'creative-6')).toEqual([])
  })
})

describe('third-person (view-4)', () => {
  it('1인칭 대명사를 표시한다', () => {
    expect(flagged('그는 오늘 나를 봤다. 내가 웃었다.', 'view-4')).toEqual(['나를', '내가'])
  })
})

describe('no-noun (lang-1)', () => {
  it('자주 쓰는 명사와 분명한 조사가 붙은 말을 표시한다', () => {
    expect(flagged('아침에 커피를 마셨다', 'lang-1')).toEqual(['아침에', '커피를'])
  })

  it('부사와 동사 활용은 표시하지 않는다', () => {
    expect(flagged('많이 웃었고 천천히 걸었어요', 'lang-1')).toEqual([])
  })
})

describe('no-modifier (lang-5)', () => {
  it('부사와 형용사를 표시한다', () => {
    expect(flagged('정말 행복했다 조용히 사랑스러운', 'lang-5')).toEqual(['정말', '행복했다', '조용히', '사랑스러운'])
  })

  it('동사와 명사는 표시하지 않는다', () => {
    expect(flagged('밥을 먹고 공부했다 다운로드', 'lang-5')).toEqual([])
  })
})

describe('getOverLimitRange', () => {
  it('최대 글자 수를 넘긴 부분만 돌려준다', () => {
    const text = '가'.repeat(52)
    expect(getOverLimitRange(text, 50)).toEqual({ start: 50, end: 52 })
    expect(getOverLimitRange(text, 60)).toBeNull()
  })

  it('이모지는 한 글자로 센다', () => {
    const text = '😀😀😀'
    expect(getOverLimitRange(text, 2)).toEqual({ start: 4, end: 6 })
  })
})

describe('mergeRanges', () => {
  it('겹치는 구간을 합친다', () => {
    expect(mergeRanges([{ start: 5, end: 8 }, { start: 0, end: 3 }, { start: 2, end: 6 }])).toEqual([
      { start: 0, end: 8 },
    ])
  })
})
