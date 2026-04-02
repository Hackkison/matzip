import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import RestaurantList from '@/components/RestaurantList'

interface Props {
  searchParams: Promise<{ region?: string; name?: string }>
}

export default async function RestaurantsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { region, name } = await searchParams
  const regionNames = name ? name.split(',') : []

  const { data: allRestaurants } = await supabase
    .from('restaurants')
    .select('id, name, category, address, road_address, phone, image_url, price_range')
    .order('created_at', { ascending: false })

  // 지역 필터
  const filtered = regionNames.length > 0
    ? (allRestaurants ?? []).filter((r) => {
        const addr = (r.road_address || r.address || '').replace(/\s/g, '')
        return regionNames.some((rn) => addr.includes(rn))
      })
    : (allRestaurants ?? [])

  // 대표 사진 없는 식당: 최신 리뷰 사진을 썸네일로 사용
  const noImageIds = filtered.filter(r => !r.image_url).map(r => r.id)
  const reviewThumbnails: Record<string, string> = {}

  if (noImageIds.length > 0) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('restaurant_id, image_urls')
      .in('restaurant_id', noImageIds)
      .not('image_urls', 'is', null)
      .order('created_at', { ascending: false })

    // restaurant_id당 가장 최신 리뷰 사진 첫 번째 선택
    for (const review of (reviews ?? [])) {
      if (!reviewThumbnails[review.restaurant_id] && review.image_urls?.[0]) {
        reviewThumbnails[review.restaurant_id] = review.image_urls[0]
      }
    }
  }

  const restaurants = filtered.map(r => ({
    ...r,
    thumbnail_url: r.image_url ?? reviewThumbnails[r.id] ?? null,
    price_range: r.price_range ?? null,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href="/map" className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-[#1B4332]">맛집 목록</h1>
          {regionNames.length > 0 && (
            <p className="text-xs text-zinc-400">{regionNames.join(', ')}</p>
          )}
        </div>
        <Link
          href={`/restaurants/register?region=${region ?? ''}&name=${name ?? ''}`}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-medium"
        >
          <Plus size={15} />
          등록
        </Link>
      </header>

      <RestaurantList restaurants={restaurants} />
    </div>
  )
}
