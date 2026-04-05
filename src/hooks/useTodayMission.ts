import { useState, useEffect, useCallback } from 'react'
import { missions, type Mission } from '../data/missions'
import {
  getTodayMission,
  setTodayMission,
  type TodayMissionRecord,
} from '../db/indexedDB'
import { useCooldown } from './useCooldown'
import { inspirationCards } from '../data/inspirationCards'

// ─── Local date helper (YYYY-MM-DD in local timezone) ─────────────────────────

export function getLocalDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Extra data builder (lang-3: pick random bannedVowel) ─────────────────────

const KOREAN_VOWELS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']

function buildExtraData(mission: Mission): Record<string, unknown> | undefined {
  if (mission.id === 'lang-3') {
    const bannedVowel = KOREAN_VOWELS[Math.floor(Math.random() * KOREAN_VOWELS.length)]
    return { bannedVowel }
  }
  if (mission.id === 'lang-4') {
    const allowedVowel = KOREAN_VOWELS[Math.floor(Math.random() * KOREAN_VOWELS.length)]
    return { allowedVowel }
  }
  if (mission.id === 'creative-1') {
    const inspirationCard = inspirationCards[Math.floor(Math.random() * inspirationCards.length)]
    return { inspirationCard }
  }
  return undefined
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTodayMission() {
  const today = getLocalDateString()
  const { getAvailableMissions, addToCooldown, loading: cooldownLoading } = useCooldown()
  const [todayRecord, setTodayRecord] = useState<TodayMissionRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTodayMission().then((record) => {
      if (record?.date === today) {
        setTodayRecord(record)
      }
      setLoading(false)
    })
  }, [today])

  const drawMission = useCallback(async (): Promise<TodayMissionRecord> => {
    const available = getAvailableMissions()
    const mission = available[Math.floor(Math.random() * available.length)]
    const extraData = buildExtraData(mission)

    const record: TodayMissionRecord = {
      key: 'todayMission',
      date: today,
      missionId: mission.id,
      extraData,
    }

    await setTodayMission(record)
    await addToCooldown(mission.id)
    setTodayRecord(record)
    return record
  }, [today, getAvailableMissions, addToCooldown])

  const getMission = useCallback((): Mission | undefined => {
    if (!todayRecord) return undefined
    return missions.find((m) => m.id === todayRecord.missionId)
  }, [todayRecord])

  return {
    todayRecord,
    mission: getMission(),
    loading: loading || cooldownLoading,
    drawMission,
  }
}
