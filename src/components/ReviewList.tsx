'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ReviewForm from './ReviewForm'

interface Review {
  id: string
  rating: number
  content: string
  created_at: string
  user_id: string
  image_urls: string[] | null
  profiles: { name: string | null }[] | { name: string | null } | null
}

interface Props {
  restaurantId: string
  initialReviews: Review[]
  currentUserId: string
  isAdmin?: boolean
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? 'text-yellow-400' : 'text-zinc-200'}>★</span>
      ))}
    </span>
  )
}

export default function ReviewList({ restaurantId, initialReviews, currentUserId, isAdmin }: Props) {
  const supabase = createClient()
  const [reviews, setReviews] = useState(initialReviews)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const reload = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, content, created_at, user_id, image_urls, profiles(name)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
    setReviews((data as Review[]) ?? [])
    setShowForm(false)
    setEditingId(null)
  }

  const handleDelete = async (reviewId: string, isOthers: boolean) => {
    if (!confirm('리뷰를 삭제할까요?')) return
    if (isOthers) {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' })
      if (!res.ok) { alert('삭제 중 오류가 발생했습니다.'); return }
    } else {
      await supabase.from('reviews').delete().eq('id', reviewId)
    }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId))
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

  const myReview = reviews.find((r) => r.user_id === currentUserId)

  return (
    <div className="flex flex-col gap-4">
      {/* 평점 요약 */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-zinc-800">리뷰</h2>
        {avgRating && (
          <span className="flex items-center gap-1 text-sm text-zinc-500">
            <span className="text-yellow-400">★</span>
            {avgRating} <span className="text-zinc-300">({reviews.length})</span>
          </span>
        )}
      </div>

      {/* 리뷰 작성 버튼 (본인 리뷰 없을 때만) */}
      {!myReview && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 border border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
        >
          + 리뷰 작성
        </button>
      )}

      {showForm && (
        <div className="p-4 border border-zinc-200 rounded-xl">
          <ReviewForm
            restaurantId={restaurantId}
            onDone={reload}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* 리뷰 목록 */}
      {reviews.length === 0 && !showForm && (
        <p className="text-sm text-zinc-400 text-center py-4">첫 번째 리뷰를 남겨보세요</p>
      )}

      {reviews.map((review) => (
        <div key={review.id} className="flex flex-col gap-1.5 py-3 border-b border-zinc-100 last:border-0">
          {editingId === review.id ? (
            <div className="p-3 border border-zinc-200 rounded-xl">
              <ReviewForm
                restaurantId={restaurantId}
                existing={{ id: review.id, rating: review.rating, content: review.content }}
                onDone={reload}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/users/${review.user_id}`}
                    className="text-xs font-medium text-zinc-700 hover:text-[#1B4332] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(Array.isArray(review.profiles)
                      ? review.profiles[0]?.name
                      : review.profiles?.name) ?? '익명'}
                  </Link>
                  <Stars rating={review.rating} />
                </div>
                {(review.user_id === currentUserId || isAdmin) && (
                  <div className="flex gap-2">
                    {review.user_id === currentUserId && (
                      <button
                        onClick={() => setEditingId(review.id)}
                        className="text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        수정
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(review.id, review.user_id !== currentUserId)}
                      className="text-xs text-zinc-400 hover:text-red-500"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">{review.content}</p>

              {/* 리뷰 사진 */}
              {review.image_urls && review.image_urls.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-1">
                  {review.image_urls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                      className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-100 block shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`리뷰 사진 ${idx + 1}`} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}

              <p className="text-xs text-zinc-300">
                {new Date(review.created_at).toLocaleDateString('ko-KR')}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
