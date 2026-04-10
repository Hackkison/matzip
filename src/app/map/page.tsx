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
    // 최근 맛집 6개의 리뷰 사진 (식당 대표 사진 없을 때 폴백)
    supabase
      .from('reviews')
      .select('restaurant_id, image_urls')
      .not('image_urls', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30),
    user
      ? supabase.from('favorites').select('restaurant_id').eq('user_id', user.id)
      : Promise.resolve({ data: [], error: null }),
  ])

  const favoritedIds = new Set((favData ?? []).map((f) => f.restaurant_id))

  // 리뷰 썸네일 맵 (식당별 첫 번째 리뷰 사진)
  const reviewThumbnails: Record<string, string> = {}
  for (const rv of (recentReviews ?? [])) {
    if (!reviewThumbnails[rv.restaurant_id] && rv.image_urls?.[0]) {
      reviewThumbnails[rv.restaurant_id] = rv.image_urls[0]
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
