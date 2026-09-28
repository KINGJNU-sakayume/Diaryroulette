import { useState, useEffect, useCallback } from 'react'
import { getMission } from '../data/missions'
import { getTodayMission, setTodayMission, type TodayMissionRecord } from '../db/indexedDB'
import { useCooldown } from './useCooldown'
import { drawExtraData } from '../lib/draw'
import { getEffectiveDateString } from '../lib/date'

// 예전 import 경로 호환
export { getLocalDateString, getEffectiveDateString } from '../lib/date'

export function useTodayMission() {
  const today = getEffectiveDateString()
  const { getAvailableMissions, addToCooldown, loading: cooldownLoading } = useCooldown()
  const [todayRecord, setTodayRecord] = useState<TodayMissionRecord | null>(null)
  const [loading, setLoading] = useState(true)

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
  }, [today])

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
