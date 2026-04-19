import { atomicImport } from '../db/indexedDB'
import type {
  CooldownEntry,
  JournalEntry,
  TodayMissionRecord,
} from '../db/indexedDB'
import { missions } from '../data/missions'
import type { ExportData } from './exportData'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  /** 사용자에게 보여줄 경고(버전 불일치, 일부 엔트리 드롭 등) */
  warning?: string
  /** 검증을 통과한 항목만 남긴 정제된 데이터 */
  data?: ExportData
}

// ─── Primitive guards ─────────────────────────────────────────────────────────

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

/** YYYY-MM-DD 형태이며 실제 존재하는 날짜인지 확인 */
function isValidDateId(v: unknown): v is string {
  if (!isString(v)) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  )
}

function isIsoDateTime(v: unknown): v is string {
  if (!isString(v)) return false
  if (!/^\d{4}-\d{2}-\d{2}[T ]/.test(v)) return false
  return !Number.isNaN(Date.parse(v))
}

/**
 * Canvas 컨텐츠는 반드시 `data:image/(png|jpeg|jpg|webp|gif);base64,...` 형태여야 함.
 * `javascript:`, `file:`, 외부 `http(s):` 등은 Archive 페이지에서 렌더될 때
 * XSS 또는 프라이버시 누수 벡터가 될 수 있으므로 모두 거절한다.
 */
function isSafeImageDataUrl(v: unknown): v is string {
  if (!isString(v)) return false
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)
}

// ─── Domain-level guards ──────────────────────────────────────────────────────

const VALID_JOURNAL_TYPES = new Set(['text', 'canvas', 'trash'])
const VALID_JOURNAL_STATUSES = new Set(['draft', 'completed'])

type JournalValidation = { ok: true } | { ok: false; reason: string }

function validateJournal(
  raw: unknown,
  validMissionIds: Set<string>,
): JournalValidation {
  if (!isNonNullObject(raw)) return { ok: false, reason: '객체가 아님' }

  if (!isValidDateId(raw.id))
    return { ok: false, reason: `잘못된 날짜 id: ${String(raw.id)}` }

  if (!isString(raw.missionId) || !validMissionIds.has(raw.missionId))
    return { ok: false, reason: `알 수 없는 missionId: ${String(raw.missionId)}` }

  if (!isString(raw.type) || !VALID_JOURNAL_TYPES.has(raw.type))
    return { ok: false, reason: `잘못된 type: ${String(raw.type)}` }

  if (!isString(raw.status) || !VALID_JOURNAL_STATUSES.has(raw.status))
    return { ok: false, reason: `잘못된 status: ${String(raw.status)}` }

  // content: null 또는 string. canvas 타입이면 안전한 dataURL이어야 함.
  if (raw.content !== null && !isString(raw.content))
    return { ok: false, reason: 'content가 string도 null도 아님' }
  if (raw.type === 'canvas' && raw.content !== null) {
    if (!isSafeImageDataUrl(raw.content)) {
      return { ok: false, reason: '안전하지 않은 canvas dataURL' }
    }
  }

  if (!isIsoDateTime(raw.createdAt))
    return { ok: false, reason: `잘못된 createdAt: ${String(raw.createdAt)}` }

  if (raw.completedAt !== null && !isIsoDateTime(raw.completedAt))
    return { ok: false, reason: `잘못된 completedAt: ${String(raw.completedAt)}` }

  // extraData는 optional, object일 수도 있고 undefined일 수도 있음
  if (raw.extraData !== undefined && !isNonNullObject(raw.extraData))
    return { ok: false, reason: 'extraData가 객체가 아님' }

  return { ok: true }
}

function validateTodayMission(
  raw: unknown,
  validMissionIds: Set<string>,
): raw is TodayMissionRecord {
  if (!isNonNullObject(raw)) return false
  if (raw.key !== 'todayMission') return false
  if (!isValidDateId(raw.date)) return false
  if (!isString(raw.missionId) || !validMissionIds.has(raw.missionId)) return false
  if (raw.extraData !== undefined && !isNonNullObject(raw.extraData)) return false
  return true
}

function validateCooldownEntry(
  raw: unknown,
  validMissionIds: Set<string>,
): raw is CooldownEntry {
  if (!isNonNullObject(raw)) return false
  if (!isString(raw.missionId) || !validMissionIds.has(raw.missionId)) return false
  if (!isIsoDateTime(raw.drawnAt)) return false
  return true
}

// ─── Main validator ───────────────────────────────────────────────────────────

export function validateExportData(raw: unknown): ValidationResult {
  if (!isNonNullObject(raw)) return { valid: false }

  // 최상위 구조
  if (!isString(raw.version)) return { valid: false }
  if (!Array.isArray(raw.journals)) return { valid: false }
  if (!isNonNullObject(raw.missions)) return { valid: false }

  const missionsObj = raw.missions
  if (!Array.isArray(missionsObj.cooldownList)) return { valid: false }

  // 도메인 참조 테이블
  const validMissionIds = new Set(missions.map((m) => m.id))

  // journals: 손상된 엔트리는 드롭하고 나머지만 받아들임
  const validJournals: JournalEntry[] = []
  const droppedJournals: Array<{ index: number; reason: string }> = []
  for (let i = 0; i < raw.journals.length; i++) {
    const result = validateJournal(raw.journals[i], validMissionIds)
    if (result.ok) {
      validJournals.push(raw.journals[i] as JournalEntry)
    } else {
      droppedJournals.push({ index: i, reason: result.reason })
    }
  }

  // cooldownList: 손상된 엔트리는 드롭
  const validCooldowns: CooldownEntry[] = []
  const droppedCooldowns: number[] = []
  for (let i = 0; i < missionsObj.cooldownList.length; i++) {
    const entry = missionsObj.cooldownList[i]
    if (validateCooldownEntry(entry, validMissionIds)) {
      validCooldowns.push(entry)
    } else {
      droppedCooldowns.push(i)
    }
  }

  // todayMission은 존재할 수도 null일 수도 있고, 유효하지 않으면 null로 교체
  let validTodayMission: TodayMissionRecord | null = null
  if (missionsObj.todayMission != null) {
    if (validateTodayMission(missionsObj.todayMission, validMissionIds)) {
      validTodayMission = missionsObj.todayMission
    }
  }

  // 경고 메시지 조합
  const warnings: string[] = []
  if (raw.version !== '1.0') warnings.push(`알 수 없는 버전: ${raw.version}`)
  if (droppedJournals.length > 0) {
    warnings.push(
      `일기 ${droppedJournals.length}건이 손상되어 제외됩니다 ` +
        `(예: ${droppedJournals[0].reason})`,
    )
  }
  if (droppedCooldowns.length > 0) {
    warnings.push(`쿨다운 기록 ${droppedCooldowns.length}건이 손상되어 제외됩니다`)
  }
  if (missionsObj.todayMission != null && validTodayMission === null) {
    warnings.push('오늘의 미션 기록이 손상되어 제외됩니다')
  }

  // 정제된 데이터 재구성 — 원본을 그대로 통과시키지 않고 안전한 필드만 복원
  const data: ExportData = {
    exportedAt: isIsoDateTime(raw.exportedAt)
      ? raw.exportedAt
      : new Date().toISOString(),
    version: raw.version,
    missions: {
      todayMission: validTodayMission,
      cooldownList: validCooldowns,
    },
    journals: validJournals,
  }

  return {
    valid: true,
    warning: warnings.length > 0 ? warnings.join(' / ') : undefined,
    data,
  }
}

// ─── Import executor ──────────────────────────────────────────────────────────

/**
 * 이미 validateExportData를 통과한 데이터를 IDB에 반영한다.
 * 단일 트랜잭션(atomicImport)을 사용하므로 중간 실패 시 롤백된다.
 */
export async function importFromJSON(data: ExportData): Promise<void> {
  await atomicImport({
    todayMission: data.missions.todayMission,
    cooldownList: data.missions.cooldownList ?? [],
    journals: data.journals,
  })
}
