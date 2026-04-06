import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import RestaurantList from '@/components/RestaurantList'
import { Suspense } from 'react'

interface Props {
  searchParams: Promise<{ region?: string; name?: string }>
}

// 맛집 목록 조회 — unstable_cache 제거 (Next.js 16에서 cookies() 접근 불가)
async function fetchRestaurants(regionNames: string[]) {
  const supabase = await createClient()

  let restaurantsQuery = supabase
    .from('restaurants')
    .select('id, name, category, address, road_address, phone, image_url, price_range')
    .order('created_at', { ascending: false })

  if (regionNames.length > 0) {
    const orFilter = regionNames
      .flatMap((rn) => [
        `road_address.ilike.%${rn}%`,
        `address.ilike.%${rn}%`,
      ])
      .join(',')
    restaurantsQuery = restaurantsQuery.or(orFilter)
  }

  const [{ data: filtered }, { data: reviews }] = await Promise.all([
    restaurantsQuery,
    supabase
      .from('reviews')
      .select('restaurant_id, image_urls')
      .not('image_urls', 'is', null)
      .order('created_at', { ascending: false }),
  ])

  const reviewThumbnails: Record<string, string> = {}
  for (const review of (reviews ?? [])) {
    if (!reviewThumbnails[review.restaurant_id] && review.image_urls?.[0]) {
      reviewThumbnails[review.restaurant_id] = review.image_urls[0]
    }
  }

  return (filtered ?? []).map(r => ({
    ...r,
    thumbnail_url: r.image_url ?? reviewThumbnails[r.id] ?? null,
    price_range: r.price_range ?? null,
  }))
}

// DB 쿼리를 분리한 비동기 Server Component — Suspense로 스트리밍
async function RestaurantsFetcher({ regionNames }: { regionNames: string[] }) {
  const restaurants = await fetchRestaurants(regionNames)
  return <RestaurantList restaurants={restaurants} />
}

// 리스트 로딩 중 표시할 스켈레톤
function ListSkeleton() {
  return (
    <div className="px-4 py-4 md:px-8 flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl border border-zinc-100 animate-pulse">
          <div className="w-20 h-20 rounded-lg bg-zinc-100 shrink-0" />
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <div className="h-4 w-2/5 bg-zinc-100 rounded" />
            <div className="h-3 w-1/4 bg-zinc-100 rounded" />
            <div className="h-3 w-3/5 bg-zinc-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function RestaurantsPage({ searchParams }: Props) {
  // 인증은 middleware에서 처리 — 여기서 중복 체크 불필요
  const { region, name } = await searchParams
  const regionNames = name ? name.split(',') : []

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 헤더: DB 쿼리와 무관하게 즉시 렌더 */}
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

      {/* 리스트: Suspense로 스트리밍 — 데이터 로딩 중엔 스켈레톤 표시 */}
      <Suspense fallback={<ListSkeleton />}>
        <RestaurantsFetcher regionNames={regionNames} />
      </Suspense>
    </div>
  )
}
