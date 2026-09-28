import { addDays } from './date'

/**
 * 연속 기록 일수.
 * - current: 오늘(또는 아직 오늘 일기를 안 썼다면 어제)까지 끊기지 않고 이어진 일수
 * - longest: 지금까지 가장 길었던 연속 일수
 */
export function computeStreaks(dateIds: Iterable<string>, today: string): { current: number; longest: number } {
  const days = new Set(dateIds)
  if (days.size === 0) return { current: 0, longest: 0 }

  let current = 0
  let cursor = days.has(today) ? today : addDays(today, -1)
  while (days.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  let longest = 0
  for (const id of days) {
    // 연속 구간의 첫날에서만 길이를 센다
    if (days.has(addDays(id, -1))) continue
    let len = 0
    let c = id
    while (days.has(c)) {
      len += 1
      c = addDays(c, 1)
    }
    longest = Math.max(longest, len)
  }

  return { current, longest }
}
