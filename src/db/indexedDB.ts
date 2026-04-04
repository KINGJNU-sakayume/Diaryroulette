// ─── Types ────────────────────────────────────────────────────────────────────

export interface TodayMissionRecord {
  key: 'todayMission'
  date: string // YYYY-MM-DD local
  missionId: string
  extraData?: Record<string, unknown>
}

export interface CooldownListRecord {
  key: 'cooldownList'
  entries: CooldownEntry[]
}

export interface CooldownEntry {
  missionId: string
  drawnAt: string // ISO datetime
}

export interface JournalEntry {
  id: string // YYYY-MM-DD
  missionId: string
  type: 'text' | 'canvas' | 'trash'
  content: string | null
  status: 'completed' | 'draft'
  createdAt: string // ISO
  completedAt: string | null
}

// ─── DB singleton ─────────────────────────────────────────────────────────────

const DB_NAME = 'diary-roulette'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('missions')) {
          db.createObjectStore('missions', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('journals')) {
          const js = db.createObjectStore('journals', { keyPath: 'id' })
          js.createIndex('by-status', 'status', { unique: false })
          js.createIndex('by-missionId', 'missionId', { unique: false })
        }
      }

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

// ─── Generic transaction helper ───────────────────────────────────────────────

function tx<T>(
  storeName: 'missions' | 'journals',
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return getDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        const req = fn(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

// ─── missions store ───────────────────────────────────────────────────────────

export async function getTodayMission(): Promise<TodayMissionRecord | undefined> {
  return tx<TodayMissionRecord | undefined>('missions', 'readonly', (s) => s.get('todayMission'))
}

export async function setTodayMission(record: TodayMissionRecord): Promise<void> {
  await tx<IDBValidKey>('missions', 'readwrite', (s) => s.put(record))
}

export async function getCooldownList(): Promise<CooldownEntry[]> {
  const record = await tx<CooldownListRecord | undefined>('missions', 'readonly', (s) =>
    s.get('cooldownList'),
  )
  return record?.entries ?? []
}

export async function setCooldownList(entries: CooldownEntry[]): Promise<void> {
  const record: CooldownListRecord = { key: 'cooldownList', entries }
  await tx<IDBValidKey>('missions', 'readwrite', (s) => s.put(record))
}

// ─── journals store ───────────────────────────────────────────────────────────

export async function getJournal(id: string): Promise<JournalEntry | undefined> {
  return tx<JournalEntry | undefined>('journals', 'readonly', (s) => s.get(id))
}

export async function saveJournal(entry: JournalEntry): Promise<void> {
  await tx<IDBValidKey>('journals', 'readwrite', (s) => s.put(entry))
}

export async function getAllJournals(): Promise<JournalEntry[]> {
  return tx<JournalEntry[]>('journals', 'readonly', (s) => s.getAll())
}

export async function getJournalsByStatus(
  status: 'completed' | 'draft',
): Promise<JournalEntry[]> {
  return getDB().then(
    (db) =>
      new Promise<JournalEntry[]>((resolve, reject) => {
        const transaction = db.transaction('journals', 'readonly')
        const index = transaction.objectStore('journals').index('by-status')
        const req = index.getAll(status)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function deleteJournal(id: string): Promise<void> {
  await tx<undefined>('journals', 'readwrite', (s) => s.delete(id))
}
