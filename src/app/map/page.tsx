import { createClient } from '@/lib/supabase/server'
import MapClient from '@/components/MapClient'

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { count: restaurantCount },
    { data: recentRaw },
    { data: recentReviews },
    { data: favData },
  ] = await Promise.all([
    user
      ? supabase.from('profiles').select('name').eq('id', user.id).single()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    supabase
      .from('restaurants')
      .select('id, name, category, image_url')
      .order('created_at', { ascending: false })
      .limit(6),
    // 리뷰 사진 + 좋아요 수 (식당별 최다 좋아요 리뷰 사진을 썸네일로)
    supabase
      .from('reviews')
      .select('restaurant_id, image_urls, review_likes(user_id)')
      .not('image_urls', 'is', null)
      .order('created_at', { ascending: false })
      .limit(60),
    user
      ? supabase.from('favorites').select('restaurant_id').eq('user_id', user.id)
      : Promise.resolve({ data: [], error: null }),
  ])

  const favoritedIds = new Set((favData ?? []).map((f) => f.restaurant_id))

  // 식당별 좋아요 최다 리뷰의 첫 번째 사진을 썸네일로 선정 (동점 시 최신 우선)
  const reviewThumbnails: Record<string, string> = {}
  const maxLikes: Record<string, number> = {}
  for (const rv of (recentReviews ?? [])) {
    if (!rv.image_urls?.[0]) continue
    const likeCount = Array.isArray(rv.review_likes) ? rv.review_likes.length : 0
    const existing = maxLikes[rv.restaurant_id]
    if (existing === undefined || likeCount > existing) {
      reviewThumbnails[rv.restaurant_id] = rv.image_urls[0]
      maxLikes[rv.restaurant_id] = likeCount
    }
  }

  const recentRestaurants = (recentRaw ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    isFavorited: favoritedIds.has(r.id),
    thumbnail_url: r.image_url ?? reviewThumbnails[r.id] ?? null,
  }))

  return (
    <MapClient
      nickname={(profile as { name?: string } | null)?.name ?? null}
      restaurantCount={restaurantCount ?? 0}
      recentRestaurants={recentRestaurants}
      isLoggedIn={!!user}
    />
  )
}
