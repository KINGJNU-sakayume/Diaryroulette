/**
 * What 일기 룰렛 does with a Life Hub `daily_mission` proposal, by its own rules (Life Hub only draws from what
 * the app shared; the app stays the authority for the day's mission):
 * - a past diary day, or a day that already has another mission → rejected (the app's last check)
 * - the day already has this mission → just the receipt
 * - approved in the Claude card, no last check asked, auto-apply on, today, and not resting in the 7-day
 *   cooldown → saved as today's mission (extras drawn here), cooldown updated, receipt
 * - anything else waits for the owner on the home screen
 */
import { getMission, type Mission } from '../data/missions'
import { availableMissions, isCoolingDown } from '../hooks/useCooldown'
import { drawExtraData } from '../lib/draw'
import {
  getCooldownList, getJournal, getTodayMission, setCooldownList, setTodayMission,
  type CooldownEntry, type TodayMissionRecord,
} from '../db/indexedDB'
import { rejectLocally, rememberReceipt, stateRefs, type Deps, type Proposal, type RefItem } from './lifehub'

import { APPLIED_EVENT } from './events'
export { APPLIED_EVENT }

export interface DayState {
  /** The app's diary day (getEffectiveDateString). */
  today: string
  /** The mission chosen for `today` (today's record, or the mission of a diary already started), if any. */
  todayMissionId: string | null
  cooldowns: CooldownEntry[]
  now: Date
}
export type Decision =
  | { kind: 'apply'; mission: Mission }
  | { kind: 'receipt' }
  | { kind: 'reject'; reason: 'past' | 'other-mission' | 'unknown-mission' }
  | { kind: 'wait'; reason: 'pending' | 'review' | 'auto-off' | 'resting' | 'future' }

export function decide(p: Proposal, day: DayState, autoApply: boolean): Decision {
  const mission = getMission(p.missionId)
  if (p.date < day.today) return { kind: 'reject', reason: 'past' }
  if (p.date > day.today) return { kind: 'wait', reason: 'future' }
  if (day.todayMissionId) return day.todayMissionId === p.missionId ? { kind: 'receipt' } : { kind: 'reject', reason: 'other-mission' }
  if (!mission) return { kind: 'reject', reason: 'unknown-mission' }
  if (!availableMissions(day.cooldowns, day.now).some((m) => m.id === mission.id)) return { kind: 'wait', reason: 'resting' }
  if (p.status !== 'approved') return { kind: 'wait', reason: 'pending' }
  if (p.needsAppReview) return { kind: 'wait', reason: 'review' }
  if (!autoApply) return { kind: 'wait', reason: 'auto-off' }
  return { kind: 'apply', mission }
}

/** The day as the app sees it right now (IndexedDB). */
export async function readDay(today: string, now = new Date()): Promise<DayState> {
  const [record, journal, cooldowns] = await Promise.all([getTodayMission(), getJournal(today), getCooldownList()])
  const todayMissionId = journal?.missionId ?? (record?.date === today ? record.missionId : null)
  return { today, todayMissionId, cooldowns, now }
}

/** Today's state for the Claude card (resting missions, today's mission). */
export function dayRefs(day: DayState): RefItem[] {
  const resting = day.cooldowns.filter((e) => isCoolingDown(e, day.now)).map((e) => e.missionId)
  return stateRefs(resting, day.todayMissionId ? { date: day.today, missionId: day.todayMissionId } : null)
}

/** Makes `mission` today's mission exactly like the app's own draw (extras, cooldown). */
export async function chooseMission(mission: Mission, day: DayState): Promise<TodayMissionRecord> {
  const record: TodayMissionRecord = { key: 'todayMission', date: day.today, missionId: mission.id, extraData: drawExtraData(mission) }
  await setTodayMission(record)
  const at = day.now
  await setCooldownList([
    ...day.cooldowns.filter((e) => e.missionId !== mission.id && isCoolingDown(e, at)),
    { missionId: mission.id, drawnAt: at.toISOString() },
  ])
  return record
}

/**
 * Applies every decision that needs no owner: saves at most one mission (the first one that may be saved),
 * records receipts and rejections for the next sync. Returns the proposals still waiting and what was saved.
 */
export async function applyProposals(proposals: Proposal[], today: string, autoApply: boolean, deps: Pick<Deps, 'storage'>) {
  let day = await readDay(today)
  let saved: Mission | null = null
  const waiting: Array<{ proposal: Proposal; reason: Extract<Decision, { kind: 'wait' }>['reason'] }> = []
  for (const p of [...proposals].sort((a, b) => Number(b.status === 'approved') - Number(a.status === 'approved'))) {
    const d = decide(p, day, autoApply)
    if (d.kind === 'apply') {
      await chooseMission(d.mission, day)
      rememberReceipt(p.key, p.date, deps)
      saved = d.mission
      day = await readDay(today)
    } else if (d.kind === 'receipt') rememberReceipt(p.key, p.date, deps)
    else if (d.kind === 'reject') {
      // A pending proposal for a past day is just dropped from view; only an owner-approved one is answered.
      if (p.status === 'approved' || d.reason !== 'past') rejectLocally(p.key, deps)
    } else waiting.push({ proposal: p, reason: d.reason })
  }
  if (saved && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(APPLIED_EVENT))
  return { saved, waiting, day }
}
