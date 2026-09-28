import { describe, it, expect } from 'vitest'
import { getLocalDateString } from '../hooks/useTodayMission'
import { validateExportData } from '../utils/importData'
import { missions, getMission } from '../data/missions'
import { CATEGORIES, CATEGORY_ORDER } from '../data/categories'
import { availableMissions } from '../hooks/useCooldown'
import { drawExtraData } from '../lib/draw'
import { DRAWABLE_VOWELS } from '../lib/hangul'
import type { ExportData } from '../utils/exportData'

// ─── getLocalDateString ───────────────────────────────────────────────────────

describe('getLocalDateString', () => {
  it('returns a string', () => {
    expect(typeof getLocalDateString()).toBe('string')
  })

  it('returns a string of length 10', () => {
    expect(getLocalDateString()).toHaveLength(10)
  })

  it('matches YYYY-MM-DD format', () => {
    expect(/^\d{4}-\d{2}-\d{2}$/.test(getLocalDateString())).toBe(true)
  })

  it('year part is a plausible calendar year (>= 2020)', () => {
    const year = parseInt(getLocalDateString().split('-')[0], 10)
    expect(year).toBeGreaterThanOrEqual(2020)
  })

  it('month part is between 1 and 12', () => {
    const month = parseInt(getLocalDateString().split('-')[1], 10)
    expect(month).toBeGreaterThanOrEqual(1)
    expect(month).toBeLessThanOrEqual(12)
  })

  it('day part is between 1 and 31', () => {
    const day = parseInt(getLocalDateString().split('-')[2], 10)
    expect(day).toBeGreaterThanOrEqual(1)
    expect(day).toBeLessThanOrEqual(31)
  })
})

// ─── validateExportData ───────────────────────────────────────────────────────

const minimalValid: ExportData = {
  exportedAt: '2026-04-05T00:00:00.000Z',
  version: '1.0',
  missions: { todayMission: null, cooldownList: [] },
  journals: [],
}

describe('validateExportData — invalid inputs', () => {
  it('returns invalid for null input', () => {
    expect(validateExportData(null).valid).toBe(false)
  })

  it('returns invalid for undefined input', () => {
    expect(validateExportData(undefined).valid).toBe(false)
  })

  it('returns invalid for a string', () => {
    expect(validateExportData('hello').valid).toBe(false)
  })

  it('returns invalid for a number', () => {
    expect(validateExportData(42).valid).toBe(false)
  })

  it('returns invalid for an empty object', () => {
    expect(validateExportData({}).valid).toBe(false)
  })

  it('returns invalid when version is missing', () => {
    expect(validateExportData({ journals: [], missions: {} }).valid).toBe(false)
  })

  it('returns invalid when journals is missing', () => {
    expect(validateExportData({ version: '1.0', missions: {} }).valid).toBe(false)
  })

  it('returns invalid when missions is missing', () => {
    expect(validateExportData({ version: '1.0', journals: [] }).valid).toBe(false)
  })

  it('returns invalid when journals is not an array', () => {
    expect(validateExportData({ version: '1.0', journals: 'not-array', missions: {} }).valid).toBe(false)
  })
})

describe('validateExportData — valid inputs', () => {
  it('returns valid for a minimal well-formed object', () => {
    expect(validateExportData(minimalValid).valid).toBe(true)
  })

  it('returns valid and data deeply equals the input object', () => {
    const result = validateExportData(minimalValid)
    expect(result.data).toEqual(minimalValid)
  })

  it('returns no warning for version 1.0', () => {
    const result = validateExportData(minimalValid)
    expect(result.warning).toBeUndefined()
  })

  it('returns a warning string for an unknown version', () => {
    const result = validateExportData({ ...minimalValid, version: '2.0' })
    expect(result.valid).toBe(true)
    expect(typeof result.warning).toBe('string')
  })

  it('warning message contains the unknown version number', () => {
    const result = validateExportData({ ...minimalValid, version: '2.0' })
    expect(result.warning).toContain('2.0')
  })
})

// ─── validateExportData — 항목 단위 검증 ─────────────────────────────────────

describe('validateExportData — entries', () => {
  const journal = {
    id: '2026-09-01',
    missionId: 'form-1',
    type: 'text',
    content: '【첫 번째】\n버스가 바로 왔다.',
    status: 'completed',
    createdAt: '2026-09-01T10:00:00.000Z',
    completedAt: '2026-09-01T10:10:00.000Z',
    extraData: { answers: [{ label: '첫 번째', value: '버스가 바로 왔다.' }] },
  }

  it('양식 일기(extraData.answers)를 그대로 받아들인다', () => {
    const result = validateExportData({ ...minimalValid, journals: [journal] })
    expect(result.data?.journals).toHaveLength(1)
    expect(result.warning).toBeUndefined()
  })

  it('알 수 없는 미션·잘못된 날짜·위험한 이미지 주소는 빼고 경고한다', () => {
    const result = validateExportData({
      ...minimalValid,
      journals: [
        journal,
        { ...journal, id: '2026-09-02', missionId: 'nope-1' },
        { ...journal, id: '2026-02-30' },
        { ...journal, id: '2026-09-03', missionId: 'visual-1', type: 'canvas', content: 'javascript:alert(1)' },
      ],
    })
    expect(result.data?.journals.map((j) => j.id)).toEqual(['2026-09-01'])
    expect(result.warning).toContain('3건')
  })
})

// ─── missions ───────────────────────────────────────────────────────────────

describe('missions — shape', () => {
  it('미션 id가 겹치지 않는다', () => {
    expect(new Set(missions.map((m) => m.id)).size).toBe(missions.length)
  })

  it('예전 버전에서 저장된 미션 id가 모두 남아 있다 (기록이 끊기지 않도록)', () => {
    const legacyIds = [
      ...Array.from({ length: 9 }, (_, i) => `lang-${i + 1}`),
      ...Array.from({ length: 7 }, (_, i) => `view-${i + 1}`),
      ...Array.from({ length: 8 }, (_, i) => `time-${i + 1}`),
      ...Array.from({ length: 8 }, (_, i) => `visual-${i + 1}`),
      ...Array.from({ length: 10 }, (_, i) => `creative-${i + 1}`),
    ]
    expect(legacyIds.filter((id) => !getMission(id))).toEqual([])
  })

  it('모든 카테고리에 미션이 하나 이상 있다', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(missions.some((m) => m.category === cat)).toBe(true)
    }
  })

  it('id 접두어는 알려진 것만 쓴다', () => {
    expect(missions.every((m) => /^(lang|view|time|visual|creative|form)-\d+$/.test(m.id))).toBe(true)
  })

  it('제목과 설명이 비어 있지 않다', () => {
    expect(missions.every((m) => m.title.trim() && m.description.trim())).toBe(true)
  })
})

describe('missions — 작성 방식별 설정', () => {
  it('타이머 미션은 양의 정수 초를 가진다', () => {
    const timed = missions.filter((m) => m.editorType === 'timed-text')
    expect(timed.length).toBeGreaterThan(0)
    expect(timed.every((m) => Number.isInteger(m.timerSeconds) && (m.timerSeconds ?? 0) > 0)).toBe(true)
  })

  it('타이머가 있는 미션은 타이머 방식이다', () => {
    expect(missions.filter((m) => m.timerSeconds).every((m) => m.editorType === 'timed-text')).toBe(true)
  })

  it('글자 수 제한은 min <= max 이다', () => {
    for (const m of missions.filter((x) => x.charLimit)) {
      const { min, max } = m.charLimit!
      if (min !== undefined) expect(min).toBeGreaterThan(0)
      if (max !== undefined) expect(max).toBeGreaterThan(0)
      if (min !== undefined && max !== undefined) expect(min).toBeLessThanOrEqual(max)
    }
  })

  it('그리기 미션은 캔버스 모드를, 양식 미션은 칸 목록을 가진다', () => {
    for (const m of missions) {
      if (m.editorType === 'canvas') expect(m.canvasMode).toBeDefined()
      if (m.editorType === 'prompts') expect(m.prompts?.length).toBeGreaterThan(0)
      if (m.canvasMode) expect(m.editorType).toBe('canvas')
      if (m.prompts) expect(m.editorType).toBe('prompts')
    }
  })

  it('양식 미션의 칸 이름은 한 미션 안에서 겹치지 않는다', () => {
    for (const m of missions.filter((x) => x.prompts)) {
      const labels = m.prompts!.map((p) => p.label)
      expect(new Set(labels).size).toBe(labels.length)
    }
  })

  it('접두어 검사 미션은 접두어를 가진다', () => {
    for (const m of missions.filter((x) => x.check === 'sentence-prefix')) {
      expect(m.sentencePrefix).toBeTruthy()
    }
  })

  it('time-1은 지우기 금지, creative-8은 파쇄 방식이다', () => {
    expect(getMission('time-1')?.noDelete).toBe(true)
    expect(getMission('creative-8')?.editorType).toBe('trash')
  })
})

describe('drawExtraData', () => {
  it('모음 미션은 기본 모음 중에서 뽑는다', () => {
    for (let i = 0; i < 20; i++) {
      const banned = drawExtraData(getMission('lang-3')!)?.bannedVowel
      const allowed = drawExtraData(getMission('lang-4')!)?.allowedVowel
      expect(DRAWABLE_VOWELS).toContain(banned)
      expect(DRAWABLE_VOWELS).toContain(allowed)
    }
  })

  it('영감 카드 미션은 문장을 하나 뽑는다', () => {
    expect(typeof drawExtraData(getMission('creative-1')!)?.inspirationCard).toBe('string')
  })

  it('추첨이 없는 미션은 undefined', () => {
    expect(drawExtraData(getMission('view-1')!)).toBeUndefined()
  })
})

describe('availableMissions', () => {
  const now = new Date('2026-09-28T12:00:00')

  it('7일 안에 뽑힌 미션은 빠진다', () => {
    const list = availableMissions([{ missionId: 'lang-1', drawnAt: '2026-09-25T12:00:00' }], now)
    expect(list.some((m) => m.id === 'lang-1')).toBe(false)
    expect(list).toHaveLength(missions.length - 1)
  })

  it('7일이 지나면 다시 나온다', () => {
    const list = availableMissions([{ missionId: 'lang-1', drawnAt: '2026-09-20T12:00:00' }], now)
    expect(list.some((m) => m.id === 'lang-1')).toBe(true)
  })

  it('전부 쉬는 중이면 가장 오래된 미션 하나를 풀어 준다', () => {
    const all = missions.map((m, i) => ({ missionId: m.id, drawnAt: new Date(now.getTime() - (i + 1) * 60_000).toISOString() }))
    const list = availableMissions(all, now)
    expect(list.map((m) => m.id)).toEqual([missions[missions.length - 1].id])
  })
})

// ─── categories ───────────────────────────────────────────────────────────────

const HEX_RE = /^#[0-9a-f]{6}$/i

describe('CATEGORIES', () => {
  it('순서 목록과 정의가 일치한다', () => {
    expect(Object.keys(CATEGORIES).sort()).toEqual([...CATEGORY_ORDER].sort())
  })

  it('색상 값이 올바른 hex다', () => {
    for (const cat of CATEGORY_ORDER) {
      const c = CATEGORIES[cat]
      expect(HEX_RE.test(c.color)).toBe(true)
    }
  })

  it('이름과 소개가 비어 있지 않다', () => {
    expect(CATEGORY_ORDER.every((c) => CATEGORIES[c].label && CATEGORIES[c].blurb)).toBe(true)
  })
})
