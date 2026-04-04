import { useState, useEffect, useCallback } from 'react'
import { missions, type Mission } from '../data/missions'
import {
  getCooldownList,
  setCooldownList as persistCooldownList,
  type CooldownEntry,
} from '../db/indexedDB'

const COOLDOWN_DAYS = 14

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86_400_000
}

export function useCooldown() {
  const [cooldownList, setCooldownList] = useState<CooldownEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCooldownList().then((list) => {
      setCooldownList(list)
      setLoading(false)
    })
  }, [])

  const getAvailableMissions = useCallback((): Mission[] => {
    const now = new Date()
    const cooledIds = new Set(
      cooldownList
        .filter((e) => daysBetween(new Date(e.drawnAt), now) < COOLDOWN_DAYS)
        .map((e) => e.missionId),
    )

    const available = missions.filter((m) => !cooledIds.has(m.id))

    // Edge case: all on cooldown → force-unlock the soonest expiring one
    if (available.length === 0) {
      const soonest = cooldownList.reduce((a, b) =>
        new Date(a.drawnAt) < new Date(b.drawnAt) ? a : b,
      )
      return missions.filter((m) => m.id === soonest.missionId)
    }

    return available
  }, [cooldownList])

  const addToCooldown = useCallback(
    async (missionId: string): Promise<void> => {
      const newEntry: CooldownEntry = { missionId, drawnAt: new Date().toISOString() }
      const updated = [...cooldownList.filter((e) => e.missionId !== missionId), newEntry]
      await persistCooldownList(updated)
      setCooldownList(updated)
    },
    [cooldownList],
  )

  const getActiveCooldowns = useCallback((): Array<CooldownEntry & { daysLeft: number }> => {
    const now = new Date()
    return cooldownList
      .filter((e) => daysBetween(new Date(e.drawnAt), now) < COOLDOWN_DAYS)
      .map((e) => ({
        ...e,
        daysLeft: Math.ceil(COOLDOWN_DAYS - daysBetween(new Date(e.drawnAt), now)),
      }))
  }, [cooldownList])

  return { cooldownList, loading, getAvailableMissions, addToCooldown, getActiveCooldowns }
}
