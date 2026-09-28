// 날짜 도우미. 일기의 id는 로컬 기준 'YYYY-MM-DD' 문자열이다.

/** 새벽 2시 전까지는 전날 일기로 친다(밤늦게 쓰는 사람을 위해). */
export const DAY_START_HOUR = 2

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function toDateId(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 달력상의 오늘(로컬). */
export function getLocalDateString(now: Date = new Date()): string {
  return toDateId(now)
}

/** 일기 기준 "오늘". 새벽 2시 전이면 어제 날짜. */
export function getEffectiveDateString(now: Date = new Date()): string {
  if (now.getHours() < DAY_START_HOUR) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return toDateId(d)
  }
  return toDateId(now)
}

export function isDateId(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function parseDateId(id: string): Date {
  const [y, m, d] = id.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(id: string, days: number): string {
  const d = parseDateId(id)
  d.setDate(d.getDate() + days)
  return toDateId(d)
}

/** 9월 28일 일요일 */
export function formatDateLong(id: string): string {
  const d = parseDateId(id)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`
}

/** 9월 28일 (일) */
export function formatDateShort(id: string): string {
  const d = parseDateId(id)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

/** 2026년 9월 */
export function formatMonth(id: string): string {
  const d = parseDateId(id)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

export function weekdayLabel(id: string): string {
  return WEEKDAYS[parseDateId(id).getDay()]
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}
