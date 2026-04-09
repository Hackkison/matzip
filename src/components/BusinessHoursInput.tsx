'use client'

import { DAY_KEYS, DAY_LABELS, type DayKey } from '@/lib/businessHours'

export interface DayInput { open: string; close: string; closed: boolean }
export type HoursInput = Record<DayKey, DayInput>

export const DEFAULT_HOURS: HoursInput = {
  mon: { open: '11:00', close: '21:00', closed: false },
  tue: { open: '11:00', close: '21:00', closed: false },
  wed: { open: '11:00', close: '21:00', closed: false },
  thu: { open: '11:00', close: '21:00', closed: false },
  fri: { open: '11:00', close: '21:00', closed: false },
  sat: { open: '11:00', close: '21:00', closed: false },
  sun: { open: '11:00', close: '21:00', closed: false },
}

// HoursInput → DB 저장 형식으로 변환
export function toBusinessHours(input: HoursInput) {
  return Object.fromEntries(
    DAY_KEYS.map((day) => [
      day,
      input[day].closed ? null : { open: input[day].open, close: input[day].close },
    ])
  )
}

interface Props {
  value: HoursInput
  onChange: (v: HoursInput) => void
}

export default function BusinessHoursInput({ value, onChange }: Props) {
  const setDay = (day: DayKey, patch: Partial<DayInput>) =>
    onChange({ ...value, [day]: { ...value[day], ...patch } })

  return (
    <div className="flex flex-col gap-2.5">
      {DAY_KEYS.map((day) => {
        const d = value[day]
        return (
          <div key={day} className="flex items-center gap-2">
            <span className="w-5 text-xs font-medium text-zinc-500 shrink-0 text-center">
              {DAY_LABELS[day]}
            </span>
            <button
              type="button"
              onClick={() => setDay(day, { closed: !d.closed })}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                d.closed
                  ? 'bg-zinc-100 text-zinc-400 border-zinc-200'
                  : 'bg-[#1B4332]/10 text-[#1B4332] border-[#1B4332]/20'
              }`}
            >
              {d.closed ? '휴무' : '영업'}
            </button>
            {!d.closed && (
              <>
                <input
                  type="time"
                  value={d.open}
                  onChange={(e) => setDay(day, { open: e.target.value })}
                  className="flex-1 min-w-0 px-2 py-1 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-[#1B4332]"
                />
                <span className="text-xs text-zinc-300">~</span>
                <input
                  type="time"
                  value={d.close}
                  onChange={(e) => setDay(day, { close: e.target.value })}
                  className="flex-1 min-w-0 px-2 py-1 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-[#1B4332]"
                />
              </>
            )}
            {d.closed && <span className="text-xs text-zinc-300 ml-1">쉬는 날</span>}
          </div>
        )
      })}
    </div>
  )
}
