import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin, Phone, ExternalLink } from 'lucide-react'
import ReviewList from '@/components/ReviewList'
import DeleteRestaurantButton from '@/components/DeleteRestaurantButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RestaurantDetailPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const [{ data: restaurant }, { data: reviews }, { data: profile }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', id).single(),
    supabase
      .from('reviews')
      .select('id, rating, content, created_at, user_id, image_urls, profiles(name)')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
  ])

  if (!restaurant) notFound()

  const isAdmin = profile?.is_admin === true
  const canDelete = isAdmin

  const address = restaurant.road_address || restaurant.address
  const kakaoMapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(restaurant.name)},${restaurant.lat},${restaurant.lng}`

  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href="/restaurants" className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-[#1B4332] truncate">{restaurant.name}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">{restaurant.category}</span>
            {avgRating && (
              <span className="text-xs text-zinc-400">
                <span className="text-yellow-400">★</span> {avgRating}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 md:px-8 max-w-lg mx-auto w-full gap-6">
        {/* 대표 사진 */}
        {restaurant.image_url && (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* 기본 정보 */}
        <section className="flex flex-col gap-3">
          <InfoRow icon={<MapPin size={15} />} label="주소" value={address} />
          {restaurant.phone && (
            <InfoRow icon={<Phone size={15} />} label="전화" value={restaurant.phone} />
          )}
        </section>

        {/* 카카오맵 링크 */}
        <a
          href={kakaoMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
        >
          <ExternalLink size={14} />
          카카오맵에서 보기
        </a>

        {/* 리뷰 */}
        <section>
          <ReviewList
            restaurantId={id}
            initialReviews={(reviews ?? []) as Parameters<typeof ReviewList>[0]['initialReviews']}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        </section>

        {/* 삭제 (관리자) */}
        {canDelete && <DeleteRestaurantButton restaurantId={id} />}
      </main>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 text-zinc-400 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
        <p className="text-sm text-zinc-700">{value}</p>
      </div>
    </div>
  )
}
