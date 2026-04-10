'use client'

import { DAY_KEYS, DAY_LABELS, type DayKey } from '@/lib/businessHours'

export interface DayInput {
  open: string
  close: string
  closed: boolean
  hasBreak: boolean
  breakStart: string
  breakEnd: string
}
export type HoursInput = Record<DayKey, DayInput>

export const DEFAULT_HOURS: HoursInput = {
  mon: { open: '11:00', close: '21:00', closed: false, hasBreak: false, breakStart: '15:00', breakEnd: '17:00' },
  tue: { open: '11:00', close: '21:00', closed: false, hasBreak: false, breakStart: '15:00', breakEnd: '17:00' },
  wed: { open: '11:00', close: '21:00', closed: false, hasBreak: false, breakStart: '15:00', breakEnd: '17:00' },
  thu: { open: '11:00', close: '21:00', closed: false, hasBreak: false, breakStart: '15:00', breakEnd: '17:00' },
  fri: { open: '11:00', close: '21:00', closed: false, hasBreak: false, breakStart: '15:00', breakEnd: '17:00' },
  sat: { open: '11:00', close: '21:00', closed: false, hasBreak: false, breakStart: '15:00', breakEnd: '17:00' },
  sun: { open: '11:00', close: '21:00', closed: false, hasBreak: false, breakStart: '15:00', breakEnd: '17:00' },
}

// HoursInput → DB 저장 형식으로 변환
export function toBusinessHours(input: HoursInput) {
  return Object.fromEntries(
    DAY_KEYS.map((day) => {
      const d = input[day]
      if (d.closed) return [day, null]
      return [day, {
        open: d.open,
        close: d.close,
        ...(d.hasBreak && d.breakStart && d.breakEnd
          ? { breakStart: d.breakStart, breakEnd: d.breakEnd }
          : {}),
      }]
    })
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
    <div className="flex flex-col gap-3">
      {DAY_KEYS.map((day) => {
        const d = value[day]
        return (
          <div key={day} className="flex flex-col gap-1.5">
            {/* 영업시간 행 */}
            <div className="flex items-center gap-2">
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

            {/* 브레이크 타임 행 */}
            {!d.closed && (
              <div className="flex items-center gap-2 pl-7">
                <button
                  type="button"
                  onClick={() => setDay(day, { hasBreak: !d.hasBreak })}
                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    d.hasBreak
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                  }`}
                >
                  {d.hasBreak ? '브레이크' : '+ 브레이크'}
                </button>
                {d.hasBreak && (
                  <>
                    <input
                      type="time"
                      value={d.breakStart}
                      onChange={(e) => setDay(day, { breakStart: e.target.value })}
                      className="flex-1 min-w-0 px-2 py-0.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 bg-amber-50/50"
                    />
                    <span className="text-xs text-zinc-300">~</span>
                    <input
                      type="time"
                      value={d.breakEnd}
                      onChange={(e) => setDay(day, { breakEnd: e.target.value })}
                      className="flex-1 min-w-0 px-2 py-0.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 bg-amber-50/50"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
