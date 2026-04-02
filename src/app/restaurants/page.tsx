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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { region, name } = await searchParams
  const regionNames = name ? name.split(',') : []

  const { data: allRestaurants } = await supabase
    .from('restaurants')
    .select('id, name, category, address, road_address, phone, image_url')
    .order('created_at', { ascending: false })

  // 선택한 지역 필터링 (주소에서 공백 제거 후 시/군/구 이름 매칭)
  const restaurants = regionNames.length > 0
    ? (allRestaurants ?? []).filter((r) => {
        const addr = (r.road_address || r.address || '').replace(/\s/g, '')
        return regionNames.some((rn) => addr.includes(rn))
      })
    : allRestaurants

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

      <RestaurantList restaurants={restaurants ?? []} />
    </div>
  )
}
