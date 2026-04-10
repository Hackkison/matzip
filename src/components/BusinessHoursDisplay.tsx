'use client'

import { Clock } from 'lucide-react'
import { DAY_KEYS, DAY_LABELS, type BusinessHours, isOpenNow, getTodayHours, getTodayKey } from '@/lib/businessHours'

interface Props {
  hours: BusinessHours
}

export default function BusinessHoursDisplay({ hours }: Props) {
  const openStatus = isOpenNow(hours)
  const todayHours = getTodayHours(hours)
  const todayKey = getTodayKey()

  return (
    <div className="flex flex-col gap-2">
      {/* 현재 영업 상태 뱃지 */}
      <div className="flex items-center gap-2">
        <Clock size={15} className="text-zinc-400 shrink-0" />
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            openStatus ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'
          }`}
        >
          {openStatus ? '영업 중' : '영업 종료'}
        </span>
        <span className="text-xs text-zinc-400">
          {todayHours
            ? `오늘 ${todayHours.open} ~ ${todayHours.close}${todayHours.breakStart ? ` (브레이크 ${todayHours.breakStart}~${todayHours.breakEnd})` : ''}`
            : '오늘 휴무'}
        </span>
      </div>

      {/* 요일별 상세 */}
      <div className="flex flex-col gap-1 pl-[23px]">
        {DAY_KEYS.map((day) => {
          const h = hours[day]
          const isToday = day === todayKey
          return (
            <div
              key={day}
              className={`flex items-center gap-3 text-xs ${
                isToday ? 'font-semibold text-zinc-800' : 'text-zinc-400'
              }`}
            >
              <span className="w-4 shrink-0">{DAY_LABELS[day]}</span>
              <span>
                {h ? `${h.open} ~ ${h.close}` : '휴무'}
                {h?.breakStart && (
                  <span className="ml-1.5 text-amber-500">{`브레이크 ${h.breakStart}~${h.breakEnd}`}</span>
                )}
              </span>
              {isToday && <span className="text-[10px] text-[#1B4332]">오늘</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
