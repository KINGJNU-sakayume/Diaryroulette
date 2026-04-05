import {
  getTodayMission,
  getCooldownList,
  getAllJournals,
  type TodayMissionRecord,
  type CooldownEntry,
  type JournalEntry,
} from '../db/indexedDB'

export interface ExportData {
  exportedAt: string
  version: string
  missions: {
    todayMission: TodayMissionRecord | null
    cooldownList: CooldownEntry[]
  }
  journals: JournalEntry[]
}

export async function exportToJSON(): Promise<void> {
  const [todayMission, cooldownList, journals] = await Promise.all([
    getTodayMission(),
    getCooldownList(),
    getAllJournals(),
  ])

  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    missions: {
      todayMission: todayMission ?? null,
      cooldownList,
    },
    journals,
  }

  const json = JSON.stringify(data, null, 2)
  const today = new Date().toISOString().split('T')[0]
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `roulette-journal-backup-${today}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
