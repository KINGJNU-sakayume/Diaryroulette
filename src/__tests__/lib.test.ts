import { describe, it, expect } from 'vitest'
import { countChars, countEmoji, keepOnlyEmoji, stripHangul } from '../lib/text'
import { addDays, formatDateLong, getEffectiveDateString, isDateId } from '../lib/date'
import { computeStreaks } from '../lib/streak'
import { joinAnswers, restoreValues } from '../lib/prompts'
import type { PromptField } from '../data/missions'

describe('text helpers', () => {
  it('이모지를 한 글자로 센다', () => {
    expect(countChars('가😀나')).toBe(3)
    expect(countChars('👨‍👩‍👧')).toBe(1)
  })

  it('숫자·기호 같은 이모지 구성 문자 단독은 걸러 낸다', () => {
    expect(keepOnlyEmoji('123 #*abc 가')).toBe('  ')
  })

  it('합성 이모지·국기·키캡은 보존한다', () => {
    expect(keepOnlyEmoji('👨‍👩‍👧🇰🇷1️⃣👍🏽')).toBe('👨‍👩‍👧🇰🇷1️⃣👍🏽')
    expect(countEmoji('👨‍👩‍👧 🇰🇷 1️⃣')).toBe(3)
  })

  it('한글을 모두 지운다', () => {
    expect(stripHangul('Hello 안녕 ㅋㅋ')).toBe('Hello  ')
  })
})

describe('date helpers', () => {
  it('새벽 2시 전은 전날로 친다', () => {
    expect(getEffectiveDateString(new Date(2026, 8, 28, 1, 30))).toBe('2026-09-27')
    expect(getEffectiveDateString(new Date(2026, 8, 28, 2, 0))).toBe('2026-09-28')
  })

  it('월말·연말을 넘어 날짜를 더한다', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('존재하지 않는 날짜를 거른다', () => {
    expect(isDateId('2026-02-30')).toBe(false)
    expect(isDateId('2026-02-28')).toBe(true)
    expect(isDateId('2026-2-28')).toBe(false)
  })

  it('한국어 날짜 표기를 만든다', () => {
    expect(formatDateLong('2026-09-28')).toBe('9월 28일 월요일')
  })
})

describe('computeStreaks', () => {
  it('오늘까지 이어진 연속 기록을 센다', () => {
    expect(computeStreaks(['2026-09-26', '2026-09-27', '2026-09-28'], '2026-09-28')).toEqual({ current: 3, longest: 3 })
  })

  it('오늘 아직 안 썼다면 어제까지로 센다', () => {
    expect(computeStreaks(['2026-09-26', '2026-09-27'], '2026-09-28').current).toBe(2)
  })

  it('끊긴 기록은 현재 연속에 넣지 않는다', () => {
    expect(computeStreaks(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-27'], '2026-09-29')).toEqual({
      current: 0,
      longest: 3,
    })
  })
})

describe('prompt answers', () => {
  const fields: PromptField[] = [{ label: '제목', short: true }, { label: '본문' }]

  it('빈 칸은 빼고 평문으로 합친다', () => {
    expect(
      joinAnswers([
        { label: '제목', value: ' 월요일 ' },
        { label: '본문', value: '' },
      ]),
    ).toBe('【제목】\n월요일')
  })

  it('저장된 칸 값을 라벨로 찾아 복원한다', () => {
    expect(restoreValues(fields, [{ label: '본문', value: 'B' }, { label: '제목', value: 'A' }], null)).toEqual(['A', 'B'])
  })

  it('예전 형식의 글은 가장 넓은 칸에 넣는다', () => {
    expect(restoreValues(fields, undefined, '예전 글')).toEqual(['', '예전 글'])
  })
})
