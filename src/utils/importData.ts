import {
  clearAllData,
  setTodayMission,
  setCooldownList,
  saveJournal,
} from '../db/indexedDB'
import type { ExportData } from './exportData'

export interface ValidationResult {
  valid: boolean
  warning?: string
  data?: ExportData
}

export function validateExportData(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false }
  }
  const obj = raw as Record<string, unknown>

  if (!obj.version || !obj.journals || !obj.missions) {
    return { valid: false }
  }
  if (!Array.isArray(obj.journals)) {
    return { valid: false }
  }
  const missionsObj = obj.missions as Record<string, unknown>
  if (typeof missionsObj !== 'object' || missionsObj === null) {
    return { valid: false }
  }

  const warning =
    obj.version !== '1.0' ? `알 수 없는 버전: ${obj.version}` : undefined

  return { valid: true, warning, data: obj as unknown as ExportData }
}

export async function importFromJSON(data: ExportData): Promise<void> {
  await clearAllData()

  const { todayMission, cooldownList } = data.missions
  if (todayMission) {
    await setTodayMission(todayMission)
  }
  await setCooldownList(cooldownList ?? [])

  for (const journal of data.journals) {
    await saveJournal(journal)
  }
}
