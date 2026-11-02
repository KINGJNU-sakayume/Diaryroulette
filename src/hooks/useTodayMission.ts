import { useState, useEffect, useCallback } from 'react'
import { getMission } from '../data/missions'
import { getTodayMission, setTodayMission, type TodayMissionRecord } from '../db/indexedDB'
import { useCooldown } from './useCooldown'
import { drawExtraData } from '../lib/draw'
import { getEffectiveDateString } from '../lib/date'
import { APPLIED_EVENT } from '../integration/events'
import { requestLifeHubSync } from '../integration/lifehubStore'

// 예전 import 경로 호환
export { getLocalDateString, getEffectiveDateString } from '../lib/date'

export function useTodayMission() {
  const today = getEffectiveDateString()
  const { getAvailableMissions, addToCooldown, loading: cooldownLoading } = useCooldown()
  const [todayRecord, setTodayRecord] = useState<TodayMissionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)

  // A mission chosen through Life Hub (or in another tab of this app) shows up without a restart.
  useEffect(() => {
    const again = () => setReload((n) => n + 1)
    window.addEventListener(APPLIED_EVENT, again)
    return () => window.removeEventListener(APPLIED_EVENT, again)
  }, [])

  useEffect(() => {
    let alive = true
    getTodayMission()
      .then((record) => {
        if (alive) setTodayRecord(record?.date === today ? record : null)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [today, reload])

  const drawMission = useCallback(async (): Promise<TodayMissionRecord> => {
    const available = getAvailableMissions()
    const mission = available[Math.floor(Math.random() * available.length)]
    const record: TodayMissionRecord = {
      key: 'todayMission',
      date: today,
      missionId: mission.id,
      extraData: drawExtraData(mission),
    }
    await setTodayMission(record)
    await addToCooldown(mission.id)
    setTodayRecord(record)
    // Life Hub learns that today's mission is taken (a Claude card then shows it instead of drawing).
    requestLifeHubSync()
    return record
  }, [today, getAvailableMissions, addToCooldown])

  return {
    today,
    todayRecord,
    mission: getMission(todayRecord?.missionId),
    loading: loading || cooldownLoading,
    drawMission,
  }
}
