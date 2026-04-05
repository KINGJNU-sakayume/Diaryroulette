import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import {
  getTodayMission,
  setTodayMission,
  getCooldownList,
  setCooldownList,
  getJournal,
  saveJournal,
  getAllJournals,
  getJournalsByStatus,
  deleteJournal,
  clearAllData,
  type TodayMissionRecord,
  type JournalEntry,
  type CooldownEntry,
} from '../db/indexedDB'

// Each test calls clearAllData() first to ensure a clean slate.
// fake-indexeddb/auto provides an in-memory IDB environment for the whole file;
// the shared dbPromise singleton is fine because data is wiped before each test.

const makeEntry = (id: string, status: 'draft' | 'completed' = 'draft'): JournalEntry => ({
  id,
  missionId: 'view-1',
  type: 'text',
  content: 'test content',
  status,
  createdAt: new Date().toISOString(),
  completedAt: status === 'completed' ? new Date().toISOString() : null,
})

const todayRecord: TodayMissionRecord = {
  key: 'todayMission',
  date: '2026-04-05',
  missionId: 'lang-1',
}

describe('getTodayMission / setTodayMission', () => {
  it('getTodayMission returns undefined when store is empty', async () => {
    await clearAllData()
    const result = await getTodayMission()
    expect(result).toBeUndefined()
  })

  it('setTodayMission persists a record and getTodayMission retrieves it', async () => {
    await clearAllData()
    await setTodayMission(todayRecord)
    const result = await getTodayMission()
    expect(result?.missionId).toBe('lang-1')
    expect(result?.date).toBe('2026-04-05')
  })

  it('setTodayMission overwrites an existing record (upsert semantics)', async () => {
    await clearAllData()
    await setTodayMission(todayRecord)
    await setTodayMission({ ...todayRecord, missionId: 'view-2' })
    const result = await getTodayMission()
    expect(result?.missionId).toBe('view-2')
  })

  it('setTodayMission preserves extraData field', async () => {
    await clearAllData()
    await setTodayMission({ ...todayRecord, extraData: { bannedVowel: 'ㅏ' } })
    const result = await getTodayMission()
    expect((result?.extraData as Record<string, unknown>)?.bannedVowel).toBe('ㅏ')
  })
})

describe('getCooldownList / setCooldownList', () => {
  it('getCooldownList returns empty array when store is empty', async () => {
    await clearAllData()
    const result = await getCooldownList()
    expect(result).toEqual([])
  })

  it('setCooldownList persists entries and getCooldownList retrieves them', async () => {
    await clearAllData()
    const entries: CooldownEntry[] = [{ missionId: 'lang-1', drawnAt: '2026-04-01T00:00:00.000Z' }]
    await setCooldownList(entries)
    const result = await getCooldownList()
    expect(result).toHaveLength(1)
    expect(result[0].missionId).toBe('lang-1')
  })

  it('setCooldownList replaces the entire list on second call', async () => {
    await clearAllData()
    await setCooldownList([
      { missionId: 'lang-1', drawnAt: '2026-04-01T00:00:00.000Z' },
      { missionId: 'lang-2', drawnAt: '2026-04-02T00:00:00.000Z' },
    ])
    await setCooldownList([{ missionId: 'view-3', drawnAt: '2026-04-03T00:00:00.000Z' }])
    const result = await getCooldownList()
    expect(result).toHaveLength(1)
    expect(result[0].missionId).toBe('view-3')
  })

  it('setCooldownList accepts and retrieves an empty array', async () => {
    await clearAllData()
    await setCooldownList([{ missionId: 'lang-1', drawnAt: '2026-04-01T00:00:00.000Z' }])
    await setCooldownList([])
    const result = await getCooldownList()
    expect(result).toEqual([])
  })
})

describe('getJournal / saveJournal', () => {
  it('getJournal returns undefined for a non-existent id', async () => {
    await clearAllData()
    const result = await getJournal('2026-04-05')
    expect(result).toBeUndefined()
  })

  it('saveJournal persists a journal entry and getJournal retrieves it by id', async () => {
    await clearAllData()
    const entry = makeEntry('2026-04-05')
    await saveJournal(entry)
    const result = await getJournal('2026-04-05')
    expect(result?.id).toBe('2026-04-05')
    expect(result?.missionId).toBe('view-1')
    expect(result?.status).toBe('draft')
    expect(result?.content).toBe('test content')
  })

  it('saveJournal updates an existing entry (upsert semantics)', async () => {
    await clearAllData()
    await saveJournal(makeEntry('2026-04-05', 'draft'))
    await saveJournal(makeEntry('2026-04-05', 'completed'))
    const result = await getJournal('2026-04-05')
    expect(result?.status).toBe('completed')
  })

  it('saveJournal stores content as null correctly', async () => {
    await clearAllData()
    const entry: JournalEntry = { ...makeEntry('2026-04-05'), content: null }
    await saveJournal(entry)
    const result = await getJournal('2026-04-05')
    expect(result?.content).toBeNull()
  })
})

describe('getAllJournals', () => {
  it('getAllJournals returns empty array when store is empty', async () => {
    await clearAllData()
    const result = await getAllJournals()
    expect(result).toEqual([])
  })

  it('getAllJournals returns all saved entries', async () => {
    await clearAllData()
    await saveJournal(makeEntry('2026-04-03'))
    await saveJournal(makeEntry('2026-04-04'))
    await saveJournal(makeEntry('2026-04-05'))
    const result = await getAllJournals()
    expect(result).toHaveLength(3)
  })

  it('getAllJournals returns entries containing all saved ids', async () => {
    await clearAllData()
    await saveJournal(makeEntry('2026-04-04'))
    await saveJournal(makeEntry('2026-04-05'))
    const result = await getAllJournals()
    const ids = result.map((e) => e.id).sort()
    expect(ids).toEqual(['2026-04-04', '2026-04-05'])
  })
})

describe('getJournalsByStatus', () => {
  it('getJournalsByStatus("draft") returns only draft entries', async () => {
    await clearAllData()
    await saveJournal(makeEntry('2026-04-03', 'draft'))
    await saveJournal(makeEntry('2026-04-04', 'draft'))
    await saveJournal(makeEntry('2026-04-05', 'completed'))
    const result = await getJournalsByStatus('draft')
    expect(result).toHaveLength(2)
    expect(result.every((e) => e.status === 'draft')).toBe(true)
  })

  it('getJournalsByStatus("completed") returns only completed entries', async () => {
    await clearAllData()
    await saveJournal(makeEntry('2026-04-03', 'draft'))
    await saveJournal(makeEntry('2026-04-04', 'completed'))
    await saveJournal(makeEntry('2026-04-05', 'completed'))
    const result = await getJournalsByStatus('completed')
    expect(result).toHaveLength(2)
    expect(result.every((e) => e.status === 'completed')).toBe(true)
  })

  it('getJournalsByStatus returns empty array when no entries match the status', async () => {
    await clearAllData()
    await saveJournal(makeEntry('2026-04-05', 'draft'))
    const result = await getJournalsByStatus('completed')
    expect(result).toEqual([])
  })
})

describe('deleteJournal', () => {
  it('deleteJournal removes the entry so getJournal returns undefined', async () => {
    await clearAllData()
    await saveJournal(makeEntry('2026-04-05'))
    await deleteJournal('2026-04-05')
    const result = await getJournal('2026-04-05')
    expect(result).toBeUndefined()
  })

  it('deleteJournal on a non-existent id does not throw', async () => {
    await clearAllData()
    await expect(deleteJournal('nonexistent')).resolves.not.toThrow()
  })
})

describe('clearAllData', () => {
  it('clearAllData removes all entries from the journals store', async () => {
    await clearAllData()
    await saveJournal(makeEntry('2026-04-04'))
    await saveJournal(makeEntry('2026-04-05'))
    await clearAllData()
    const result = await getAllJournals()
    expect(result).toEqual([])
  })

  it('clearAllData removes todayMission from the missions store', async () => {
    await clearAllData()
    await setTodayMission(todayRecord)
    await clearAllData()
    const result = await getTodayMission()
    expect(result).toBeUndefined()
  })

  it('clearAllData removes cooldown list from the missions store', async () => {
    await clearAllData()
    await setCooldownList([{ missionId: 'lang-1', drawnAt: '2026-04-01T00:00:00.000Z' }])
    await clearAllData()
    const result = await getCooldownList()
    expect(result).toEqual([])
  })
})
