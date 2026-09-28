import { useState, useEffect, useCallback } from 'react'
import { missions, type Mission } from '../data/missions'
import {
  getCooldownList,
  setCooldownList as persistCooldownList,
  type CooldownEntry,
} from '../db/indexedDB'

/** 한 번 뽑힌 미션은 7일 동안 다시 나오지 않는다. */
export const COOLDOWN_DAYS = 7

function daysSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / 86_400_000
}

export function isCoolingDown(entry: CooldownEntry, now: Date = new Date()): boolean {
  return daysSince(entry.drawnAt, now) < COOLDOWN_DAYS
}

/** 뽑을 수 있는 미션 목록. 모두 쉬는 중이면 가장 오래전에 뽑힌 미션을 풀어 준다. */
export function availableMissions(cooldowns: CooldownEntry[], now: Date = new Date()): Mission[] {
  const resting = new Set(cooldowns.filter((e) => isCoolingDown(e, now)).map((e) => e.missionId))
  const available = missions.filter((m) => !resting.has(m.id))
  if (available.length > 0) return available

  const oldest = cooldowns.reduce((a, b) => (new Date(a.drawnAt) < new Date(b.drawnAt) ? a : b))
  return missions.filter((m) => m.id === oldest.missionId)
}

export function useCooldown() {
  const [cooldownList, setCooldownList] = useState<CooldownEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getCooldownList()
      .then((list) => {
        if (alive) setCooldownList(list)
      })
      .catch(() => {
        // 읽기에 실패해도 룰렛은 돌 수 있어야 한다 (모든 미션을 후보로)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const getAvailableMissions = useCallback(() => availableMissions(cooldownList), [cooldownList])

  const addToCooldown = useCallback(
    async (missionId: string): Promise<void> => {
      const now = new Date()
      // 기간이 끝난 기록은 이참에 정리해 목록이 계속 불어나지 않게 한다
      const updated = [
        ...cooldownList.filter((e) => e.missionId !== missionId && isCoolingDown(e, now)),
        { missionId, drawnAt: now.toISOString() },
      ]
      await persistCooldownList(updated)
      setCooldownList(updated)
    },
    [cooldownList],
  )

  const getActiveCooldowns = useCallback((): Array<CooldownEntry & { daysLeft: number }> => {
    const now = new Date()
    return cooldownList
      .filter((e) => isCoolingDown(e, now))
      .map((e) => ({ ...e, daysLeft: Math.max(1, Math.ceil(COOLDOWN_DAYS - daysSince(e.drawnAt, now))) }))
  }, [cooldownList])

  return { cooldownList, loading, getAvailableMissions, addToCooldown, getActiveCooldowns }
}
