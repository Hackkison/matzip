'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  restaurantId: string
  existing?: { id: string; rating: number; content: string }
  onDone: () => void
  onCancel?: () => void
}

export default function ReviewForm({ restaurantId, existing, onDone, onCancel }: Props) {
  const supabase = createClient()
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [content, setContent] = useState(existing?.content ?? '')
  const [hover, setHover] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (rating === 0) { setError('별점을 선택해주세요'); return }
    if (!content.trim()) { setError('내용을 입력해주세요'); return }
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (existing) {
      const { error } = await supabase
        .from('reviews')
        .update({ rating, content: content.trim(), updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) { setError('수정 중 오류가 발생했습니다'); setSubmitting(false); return }
    } else {
      const { error } = await supabase
        .from('reviews')
        .insert({ restaurant_id: restaurantId, user_id: user.id, rating, content: content.trim() })
      if (error) { setError('등록 중 오류가 발생했습니다'); setSubmitting(false); return }
    }

    onDone()
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 별점 */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl leading-none transition-transform hover:scale-110"
          >
            <span className={(hover || rating) >= s ? 'text-yellow-400' : 'text-zinc-200'}>★</span>
          </button>
        ))}
      </div>

      {/* 내용 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="맛집에 대한 솔직한 리뷰를 남겨주세요"
        rows={3}
        className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm resize-none focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
      />

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
