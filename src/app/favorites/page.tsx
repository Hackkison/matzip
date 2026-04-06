import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import RestaurantCard from '@/components/RestaurantCard'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: favorites } = await supabase
    .from('favorites')
    .select(`
      restaurant_id,
      restaurants (
        id, name, category, address, road_address, phone, image_url, price_range
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const restaurants = (favorites ?? [])
    .map((f) => f.restaurants)
    .filter(Boolean)
    .map((r: any) => ({
      ...r,
      thumbnail_url: r.image_url ?? null,
    }))

  return (
    <div className="flex min-h-screen flex-col bg-white pb-16">
      <header className="flex items-center border-b border-zinc-100 px-4 py-4 md:px-8">
        <h1 className="text-base font-semibold text-[#1B4332]">즐겨찾기</h1>
      </header>

      <main className="flex-1 px-4 py-4 md:px-8">
        {restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
            <p className="text-sm">즐겨찾기한 맛집이 없어요</p>
            <p className="text-xs">식당 상세 페이지에서 하트를 눌러보세요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {restaurants.map((r: any) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
