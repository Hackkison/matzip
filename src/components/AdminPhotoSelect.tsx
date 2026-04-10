'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'

interface Props {
  restaurantId: string
  reviewPhotos: string[]
  currentImageUrl: string | null
}

export default function AdminPhotoSelect({ restaurantId, reviewPhotos, currentImageUrl }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null) // 저장 중인 URL
  const [error, setError] = useState('')

  if (reviewPhotos.length === 0) return null

  const handleSelect = async (url: string) => {
    if (url === currentImageUrl) return
    setSaving(url)
    setError('')
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url }),
      })
      if (!res.ok) throw new Error('저장 실패')
      setOpen(false)
      router.refresh()
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        <span>리뷰 사진에서 대표 사진 선택 (관리자)</span>
        {open ? <ChevronUp size={15} className="text-zinc-400" /> : <ChevronDown size={15} className="text-zinc-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-zinc-100">
          <div className="pt-3 grid grid-cols-3 gap-2">
            {reviewPhotos.map((url) => {
              const isCurrent = url === currentImageUrl
              const isLoading = saving === url
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => handleSelect(url)}
                  disabled={!!saving}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    isCurrent ? 'border-[#1B4332]' : 'border-transparent hover:border-zinc-300'
                  } disabled:opacity-60`}
                >
                  <Image src={url} alt="" fill sizes="120px" className="object-cover" />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-[#1B4332]/30 flex items-center justify-center">
                      <Check size={20} className="text-white drop-shadow" />
                    </div>
                  )}
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={18} className="text-white animate-spin" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
