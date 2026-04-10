'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resizeToWebP } from '@/lib/image'

interface Props {
  restaurantId: string
}

export default function AdminPhotoUpload({ restaurantId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    setUploading(true)
    setError('')

    try {
      const blob = await resizeToWebP(file)
      const path = `${restaurantId}/main_${Date.now()}.webp`

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(path, blob, { contentType: 'image/webp', upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('restaurant-images').getPublicUrl(path)

      const res = await fetch(`/api/restaurants/${restaurantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: urlData.publicUrl }),
      })
      if (!res.ok) throw new Error('저장 실패')

      router.refresh()
    } catch {
      setError('사진 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-2 py-2.5 border border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors disabled:opacity-40"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        {uploading ? '업로드 중...' : '대표 사진 변경 (관리자)'}
      </button>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
