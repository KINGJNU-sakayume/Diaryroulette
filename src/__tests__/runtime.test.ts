import { describe, it, expect } from 'vitest'
import { getLocalDateString } from '../hooks/useTodayMission'
import { validateExportData } from '../utils/importData'
import { missions, CATEGORY_COLORS, CATEGORY_LABELS } from '../data/missions'
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

// ─── missions array ───────────────────────────────────────────────────────────

describe('missions array — shape and counts', () => {
  it('missions array has exactly 36 items', () => {
    expect(missions).toHaveLength(36)
  })

  it('all mission ids are unique strings', () => {
    const ids = missions.map((m) => m.id)
    expect(new Set(ids).size).toBe(36)
  })

  it('lang category has exactly 7 missions', () => {
    expect(missions.filter((m) => m.category === 'lang')).toHaveLength(7)
  })

  it('view category has exactly 7 missions', () => {
    expect(missions.filter((m) => m.category === 'view')).toHaveLength(7)
  })

  it('time category has exactly 8 missions', () => {
    expect(missions.filter((m) => m.category === 'time')).toHaveLength(8)
  })

  it('visual category has exactly 6 missions', () => {
    expect(missions.filter((m) => m.category === 'visual')).toHaveLength(6)
  })

  it('creative category has exactly 8 missions', () => {
    expect(missions.filter((m) => m.category === 'creative')).toHaveLength(8)
  })
})

describe('missions array — field integrity', () => {
  const validEditorTypes = new Set(['text', 'timed-text', 'canvas', 'emoji-only', 'trash'])

  it('every mission has a non-empty id, title, and description', () => {
    expect(
      missions.every((m) => m.id.length > 0 && m.title.length > 0 && m.description.length > 0),
    ).toBe(true)
  })

  it('every mission has a valid editorType', () => {
    expect(missions.every((m) => validEditorTypes.has(m.editorType))).toBe(true)
  })

  it('every mission id matches pattern category-number', () => {
    expect(
      missions.every((m) => /^(lang|view|time|visual|creative)-\d+$/.test(m.id)),
    ).toBe(true)
  })

  it('missions with timerSeconds have a positive integer value', () => {
    const timed = missions.filter((m) => m.timerSeconds !== undefined)
    expect(timed.length).toBeGreaterThan(0)
    expect(timed.every((m) => Number.isInteger(m.timerSeconds) && (m.timerSeconds ?? 0) > 0)).toBe(true)
  })

  it('missions with charLimit have valid min/max structure', () => {
    const limited = missions.filter((m) => m.charLimit !== undefined)
    expect(limited.length).toBeGreaterThan(0)
    for (const m of limited) {
      const { min, max } = m.charLimit!
      if (min !== undefined) expect(min).toBeGreaterThan(0)
      if (max !== undefined) expect(max).toBeGreaterThan(0)
      if (min !== undefined && max !== undefined) expect(min).toBeLessThan(max)
    }
  })

  it('time-1 has backspaceDisabled set to true', () => {
    expect(missions.find((m) => m.id === 'time-1')?.backspaceDisabled).toBe(true)
  })

  it('creative-8 has editorType of trash', () => {
    expect(missions.find((m) => m.id === 'creative-8')?.editorType).toBe('trash')
  })
})

// ─── CATEGORY_COLORS / CATEGORY_LABELS ───────────────────────────────────────

const CATEGORIES = ['lang', 'view', 'time', 'visual', 'creative'] as const
const HEX_RE = /^#[0-9a-f]{6}$/i

describe('CATEGORY_COLORS', () => {
  it('has entries for all 5 categories', () => {
    expect(CATEGORIES.every((c) => c in CATEGORY_COLORS)).toBe(true)
  })

  it('each entry has bg, text, and border string properties', () => {
    expect(
      CATEGORIES.every((c) => {
        const v = CATEGORY_COLORS[c]
        return typeof v.bg === 'string' && typeof v.text === 'string' && typeof v.border === 'string'
      }),
    ).toBe(true)
  })

  it('bg values are valid hex color strings', () => {
    expect(CATEGORIES.every((c) => HEX_RE.test(CATEGORY_COLORS[c].bg))).toBe(true)
  })

  it('text values are valid hex color strings', () => {
    expect(CATEGORIES.every((c) => HEX_RE.test(CATEGORY_COLORS[c].text))).toBe(true)
  })

  it('border values are valid hex color strings', () => {
    expect(CATEGORIES.every((c) => HEX_RE.test(CATEGORY_COLORS[c].border))).toBe(true)
  })
})

describe('CATEGORY_LABELS', () => {
  it('has entries for all 5 categories', () => {
    expect(CATEGORIES.every((c) => c in CATEGORY_LABELS)).toBe(true)
  })

  it('each value is a non-empty string', () => {
    expect(
      Object.values(CATEGORY_LABELS).every((v) => typeof v === 'string' && v.length > 0),
    ).toBe(true)
  })

  it('values match the known Korean labels exactly', () => {
    expect(CATEGORY_LABELS.lang).toBe('언어')
    expect(CATEGORY_LABELS.view).toBe('시점')
    expect(CATEGORY_LABELS.time).toBe('시간')
    expect(CATEGORY_LABELS.visual).toBe('시각')
    expect(CATEGORY_LABELS.creative).toBe('창의')
  })
})
