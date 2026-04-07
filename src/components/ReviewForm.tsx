'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resizeToWebP } from '@/lib/image'
import { ImagePlus, X } from 'lucide-react'

const MAX_IMAGES = 5

interface Props {
  restaurantId: string
  existing?: { id: string; rating: number; content: string }
  onDone: () => void
  onCancel?: () => void
}

// 0.5 단위 별 표시 컴포넌트
function StarDisplay({ index, value, size = 'lg' }: { index: number; value: number; size?: 'lg' | 'sm' }) {
  const fill = value >= index ? 100 : value >= index - 0.5 ? 50 : 0
  const sizeClass = size === 'lg' ? 'text-2xl' : 'text-base'
  return (
    <span className={`relative inline-block ${sizeClass} leading-none select-none`} style={{ width: '1em' }}>
      <span className="text-zinc-200">★</span>
      <span
        className="absolute inset-0 overflow-hidden text-yellow-400"
        style={{ width: `${fill}%` }}
      >
        ★
      </span>
    </span>
  )
}

export default function ReviewForm({ restaurantId, existing, onDone, onCancel }: Props) {
  const supabase = createClient()
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [content, setContent] = useState(existing?.content ?? '')
  const [hover, setHover] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remaining = MAX_IMAGES - imageFiles.length
    const toAdd = files.slice(0, remaining)

    setImageFiles(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx])
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (rating === 0) { setError('별점을 선택해주세요'); return }
    if (!content.trim()) { setError('내용을 입력해주세요'); return }
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 이미지 업로드
    const imageUrls: string[] = []
    for (const file of imageFiles) {
      try {
        const blob = await resizeToWebP(file)
        const path = `${restaurantId}/${user.id}_${Date.now()}.webp`
        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(path, blob, { contentType: 'image/webp', upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('review-images').getPublicUrl(path)
        imageUrls.push(urlData.publicUrl)
      } catch {
        setError('사진 업로드에 실패했습니다.')
        setSubmitting(false)
        return
      }
    }

    if (existing) {
      const { error } = await supabase
        .from('reviews')
        .update({ rating, content: content.trim(), updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) { setError('수정 중 오류가 발생했습니다'); setSubmitting(false); return }
    } else {
      const { error } = await supabase
        .from('reviews')
        .insert({
          restaurant_id: restaurantId,
          user_id: user.id,
          rating,
          content: content.trim(),
          image_urls: imageUrls,
        })
      if (error) { setError('등록 중 오류가 발생했습니다'); setSubmitting(false); return }
    }

    onDone()
  }

  const displayValue = hover || rating

  return (
    <div className="flex flex-col gap-3">
      {/* 별점 (0.5 단위) */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className="relative cursor-pointer"
              onMouseLeave={() => setHover(0)}
            >
              <StarDisplay index={s} value={displayValue} size="lg" />
              {/* 왼쪽 절반 → s-0.5점 */}
              <button
                type="button"
                className="absolute inset-y-0 left-0 w-1/2"
                onClick={() => setRating(s - 0.5)}
                onMouseEnter={() => setHover(s - 0.5)}
              />
              {/* 오른쪽 절반 → s점 */}
              <button
                type="button"
                className="absolute inset-y-0 right-0 w-1/2"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
              />
            </span>
          ))}
        </div>
        {displayValue > 0 && (
          <span className="text-xs text-zinc-400">{displayValue}점</span>
        )}
      </div>

      {/* 내용 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="맛집에 대한 솔직한 리뷰를 남겨주세요"
        rows={3}
        className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm resize-none focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
      />

      {/* 사진 첨부 (새 리뷰만) */}
      {!existing && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`사진 ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {imagePreviews.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 flex flex-col items-center justify-center gap-1 border border-dashed border-zinc-300 rounded-lg text-zinc-400 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
              >
                <ImagePlus size={16} />
                <span className="text-xs">{imagePreviews.length}/{MAX_IMAGES}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600"
          >
            취소
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {submitting ? '저장 중...' : existing ? '수정 완료' : '리뷰 등록'}
        </button>
      </div>
    </div>
  )
}
