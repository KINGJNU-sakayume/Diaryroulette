import { useSyncExternalStore } from 'react'
import type { Proposal } from './lifehub'
import { browserDeps, isConnected, needsReconnect } from './lifehub'
import type { Decision } from './lifehubApply'

export interface Waiting {
  proposal: Proposal
  reason: Extract<Decision, { kind: 'wait' }>['reason']
}
/** Shared Life Hub state for the background agent, the home banner and the settings section. */
export interface LifeHubState {
  connected: boolean
  /** Life Hub refused this device's sign-in; the owner has to connect again (settings 「확인 필요」). */
  reconnect: boolean
  syncing: boolean
  waiting: Waiting[]
  conflicts: number
  error: string
  lastSyncedAt: number | null
}

let state: LifeHubState = {
  connected: typeof localStorage !== 'undefined' && isConnected(browserDeps()),
  reconnect: typeof localStorage !== 'undefined' && needsReconnect(browserDeps()),
  syncing: false,
  waiting: [],
  conflicts: 0,
  error: '',
  lastSyncedAt: null,
}
const listeners = new Set<() => void>()

export function getLifeHubState(): LifeHubState {
  return state
}
export function setLifeHubState(patch: Partial<LifeHubState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function useLifeHub(): LifeHubState {
  return useSyncExternalStore(subscribe, getLifeHubState, getLifeHubState)
}

export const SYNC_EVENT = 'lifehub-sync'
/** Ask the agent to send decisions, share today's state and refresh proposals. */
export function requestLifeHubSync(quiet = true) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { quiet } }))
}

export const SETTINGS_EVENT = 'open-settings'
/** Open the settings sheet (Layout listens). */
export function openSettings() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SETTINGS_EVENT))
}

/** 「지금 동기화」 시각: 오늘이면 `오늘 HH:MM`, 아니면 `M월 D일 HH:MM` */
export function formatSyncTime(ts: number, now: number = Date.now()): string {
  const d = new Date(ts)
  const n = new Date(now)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const today = d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
  return today ? `오늘 ${hm}` : `${d.getMonth() + 1}월 ${d.getDate()}일 ${hm}`
}
