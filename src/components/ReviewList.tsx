'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Flag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ReviewForm from './ReviewForm'
import ReviewReportModal from './ReviewReportModal'

interface ReviewLike {
  user_id: string
}

interface Review {
  id: string
  rating: number
  content: string
  created_at: string
  user_id: string
  image_urls: string[] | null
  profiles: { name: string | null }[] | { name: string | null } | null
  review_likes: ReviewLike[]
}

interface Props {
  restaurantId: string
  initialReviews: Review[]
  currentUserId: string
  isAdmin?: boolean
}

// 0.5 단위 별 표시 컴포넌트
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((s) => {
        const fill = rating >= s ? 100 : rating >= s - 0.5 ? 50 : 0
        return (
          <span key={s} className="relative inline-block text-sm leading-none" style={{ width: '1em' }}>
            <span className="text-zinc-200">★</span>
            <span
              className="absolute inset-0 overflow-hidden text-yellow-400"
              style={{ width: `${fill}%` }}
            >
              ★
            </span>
          </span>
        )
      })}
    </span>
  )
}

type SortOption = '최신순' | '별점높은순' | '별점낮은순'
type FilterOption = '전체' | '사진있는리뷰'

export default function ReviewList({ restaurantId, initialReviews, currentUserId, isAdmin }: Props) {
  const supabase = createClient()
  const [reviews, setReviews] = useState(initialReviews)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [sort, setSort] = useState<SortOption>('최신순')
  const [filter, setFilter] = useState<FilterOption>('전체')
  const [reportingId, setReportingId] = useState<string | null>(null)

  const reload = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, content, created_at, user_id, image_urls, profiles(name), review_likes(user_id)')
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

  const toggleLike = async (reviewId: string) => {
    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }

    const review = reviews.find(r => r.id === reviewId)
    if (!review) return

    const liked = (review.review_likes ?? []).some(l => l.user_id === currentUserId)

    // 낙관적 업데이트
    setReviews(prev => prev.map(r => {
      if (r.id !== reviewId) return r
      const likes = r.review_likes ?? []
      return {
        ...r,
        review_likes: liked
          ? likes.filter(l => l.user_id !== currentUserId)
          : [...likes, { user_id: currentUserId }],
      }
    }))

    if (liked) {
      const { error } = await supabase
        .from('review_likes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', currentUserId)
      if (error) await reload()
    } else {
      const { error } = await supabase
        .from('review_likes')
        .insert({ review_id: reviewId, user_id: currentUserId })
      if (error) await reload()
    }
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

  const myReview = reviews.find((r) => r.user_id === currentUserId)

  const displayReviews = reviews
    .filter((r) => filter === '전체' || (r.image_urls && r.image_urls.length > 0))
    .sort((a, b) => {
      if (sort === '별점높은순') return b.rating - a.rating
      if (sort === '별점낮은순') return a.rating - b.rating
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

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

      {/* 필터 / 정렬 */}
      {reviews.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {(['전체', '사진있는리뷰'] as FilterOption[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  filter === f
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'text-zinc-500 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {f === '사진있는리뷰' ? '📷 사진' : '전체'}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#1B4332]"
          >
            <option value="최신순">최신순</option>
            <option value="별점높은순">별점 높은순</option>
            <option value="별점낮은순">별점 낮은순</option>
          </select>
        </div>
      )}

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
      {reviews.length > 0 && displayReviews.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-4">사진이 있는 리뷰가 없어요</p>
      )}

      {reportingId && (
        <ReviewReportModal
          reviewId={reportingId}
          onClose={() => setReportingId(null)}
        />
      )}

      {displayReviews.map((review) => {
        const likeCount = (review.review_likes ?? []).length
        const liked = (review.review_likes ?? []).some(l => l.user_id === currentUserId)

        return (
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
                    <span className="text-xs text-zinc-400">{review.rating}</span>
                  </div>
                  {(review.user_id === currentUserId || isAdmin) && (
                    <div className="flex gap-1">
                      {review.user_id === currentUserId && (
                        <button
                          onClick={() => setEditingId(review.id)}
                          className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-1.5 min-h-[36px]"
                        >
                          수정
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(review.id, review.user_id !== currentUserId)}
                        className="text-xs text-zinc-400 hover:text-red-500 px-2 py-1.5 min-h-[36px]"
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
                        className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-100 block shrink-0">
                        <Image src={url} alt={`리뷰 사진 ${idx + 1}`} fill sizes="80px" className="object-cover hover:opacity-90 transition-opacity" />
                      </a>
                    ))}
                  </div>
                )}

                {/* 하단: 날짜 + 좋아요 + 신고 */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-300">
                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleLike(review.id)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                        liked
                          ? 'text-red-500 bg-red-50'
                          : 'text-zinc-400 hover:text-red-400 hover:bg-red-50'
                      }`}
                    >
                      <Heart size={12} fill={liked ? 'currentColor' : 'none'} />
                      {likeCount > 0 && <span>{likeCount}</span>}
                    </button>
                    {/* 타인 리뷰에만 신고 버튼 표시 */}
                    {currentUserId && review.user_id !== currentUserId && !isAdmin && (
                      <button
                        onClick={() => setReportingId(review.id)}
                        className="p-1.5 text-zinc-300 hover:text-orange-400 rounded transition-colors"
                        title="삭제 요청"
                      >
                        <Flag size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
