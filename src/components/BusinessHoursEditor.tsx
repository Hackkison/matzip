'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import BusinessHoursInput, { DEFAULT_HOURS, toBusinessHours, type HoursInput } from './BusinessHoursInput'
import type { BusinessHours, DayKey } from '@/lib/businessHours'

interface Props {
  restaurantId: string
  existingHours: BusinessHours | null
}

// DB 형식 → 편집 입력 형식으로 변환
function fromBusinessHours(hours: BusinessHours | null): HoursInput {
  if (!hours) return DEFAULT_HOURS
  const result = { ...DEFAULT_HOURS }
  for (const day of Object.keys(hours) as DayKey[]) {
    const h = hours[day]
    result[day] = h
      ? { open: h.open, close: h.close, closed: false, hasBreak: !!(h.breakStart && h.breakEnd), breakStart: h.breakStart ?? '15:00', breakEnd: h.breakEnd ?? '17:00' }
      : { open: '11:00', close: '21:00', closed: true, hasBreak: false, breakStart: '15:00', breakEnd: '17:00' }
  }
  return result
}

export default function BusinessHoursEditor({ restaurantId, existingHours }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState<HoursInput>(() => fromBusinessHours(existingHours))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/restaurants/${restaurantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_hours: toBusinessHours(input) }),
    })
    setSaving(false)
    if (!res.ok) {
      setError('저장 중 오류가 발생했습니다.')
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        <span>영업시간 {existingHours ? '수정' : '등록'}</span>
        {open ? <ChevronUp size={15} className="text-zinc-400" /> : <ChevronDown size={15} className="text-zinc-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-zinc-100">
          <div className="pt-3">
            <BusinessHoursInput value={input} onChange={setInput} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-500 hover:border-zinc-300"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-[#1B4332] text-white rounded-lg text-sm disabled:opacity-40"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
