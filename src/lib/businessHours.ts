export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type DayKey = (typeof DAY_KEYS)[number]

export const DAY_LABELS: Record<DayKey, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
}

export type DayHours = { open: string; close: string } | null
export type BusinessHours = Record<DayKey, DayHours>

// JS Date.getDay(): 0=일, 1=월 ... 6=토
const JS_IDX_TO_KEY: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// 현재 영업 여부 (null = 정보 없음)
export function isOpenNow(hours: BusinessHours | null | undefined): boolean | null {
  if (!hours) return null
  const now = new Date()
  const dayHours = hours[JS_IDX_TO_KEY[now.getDay()]]
  if (dayHours === undefined) return null
  if (!dayHours) return false // 휴무

  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins >= toMinutes(dayHours.open) && nowMins < toMinutes(dayHours.close)
}

// 오늘 영업시간 반환
export function getTodayHours(hours: BusinessHours | null | undefined): DayHours | null {
  if (!hours) return null
  return hours[JS_IDX_TO_KEY[new Date().getDay()]] ?? null
}

// 오늘 요일 키 반환
export function getTodayKey(): DayKey {
  return JS_IDX_TO_KEY[new Date().getDay()]
}
