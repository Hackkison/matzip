import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, MapPin, Phone, ExternalLink } from 'lucide-react'
import ReviewList from '@/components/ReviewList'
import DeleteRestaurantButton from '@/components/DeleteRestaurantButton'
import FavoriteButton from '@/components/FavoriteButton'
import ShareButton from '@/components/ShareButton'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://matzip.vercel.app'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, category, road_address, address, image_url')
    .eq('id', id)
    .single()

  if (!restaurant) return { title: '맛집 지도' }

  const address = restaurant.road_address || restaurant.address
  const title = `${restaurant.name} — 맛집 지도`
  const description = `${address} · ${restaurant.category}`
  const url = `${SITE_URL}/restaurants/${id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: '맛집 지도',
      ...(restaurant.image_url && {
        images: [{ url: restaurant.image_url, width: 1200, height: 630, alt: restaurant.name }],
      }),
      type: 'website',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(restaurant.image_url && { images: [restaurant.image_url] }),
    },
  }
}

export default async function RestaurantDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // 비로그인 사용자: 조회는 허용, 인터랙션(즐겨찾기·리뷰작성)은 UI에서 숨김

  const { id } = await params

  // 공통 조회 (로그인 여부 무관)
  const [{ data: restaurant }, { data: reviews }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', id).single(),
    supabase
      .from('reviews')
      .select('id, rating, content, created_at, user_id, image_urls, profiles(name), review_likes(user_id)')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!restaurant) notFound()

  // 로그인 상태일 때만 추가 조회
  const [profile, favorite] = user
    ? await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
        supabase.from('favorites').select('id').eq('user_id', user.id).eq('restaurant_id', id).maybeSingle(),
      ]).then(([{ data: p }, { data: f }]) => [p, f] as const)
    : [null, null] as const

  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true
  const isFavorited = !!favorite

  const address = restaurant.road_address || restaurant.address
  const kakaoMapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(restaurant.name)},${restaurant.lat},${restaurant.lng}`
  const shareUrl = `${SITE_URL}/restaurants/${id}`

  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href={user ? '/restaurants' : '/'} className="text-zinc-400 hover:text-zinc-600">
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
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-100">
            <Image
              src={restaurant.image_url}
              alt={restaurant.name}
              fill
              sizes="(max-width: 512px) 100vw, 512px"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* 기본 정보 */}
        <section className="flex flex-col gap-3">
          <InfoRow icon={<MapPin size={15} />} label="주소" value={address} />
          {restaurant.phone && (
            <InfoRow
              icon={<Phone size={15} />}
              label="전화"
              value={restaurant.phone}
              href={`tel:${restaurant.phone.replace(/[^0-9]/g, '')}`}
            />
          )}
        </section>

        {/* 버튼 영역 */}
        <div className="flex flex-col gap-2">
          {/* 즐겨찾기 (로그인 시만) */}
          {user && <FavoriteButton restaurantId={id} initialFavorited={isFavorited} />}

          {/* 카카오맵 + 공유 버튼 나란히 */}
          <div className="flex gap-2">
            <a
              href={kakaoMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
            >
              <ExternalLink size={14} />
              카카오맵
            </a>
            <ShareButton
              title={`${restaurant.name} — 맛집 지도`}
              text={`${address} · ${restaurant.category}`}
              url={shareUrl}
            />
          </div>
        </div>

        {/* 리뷰 */}
        <section>
          <ReviewList
            restaurantId={id}
            initialReviews={(reviews ?? []) as Parameters<typeof ReviewList>[0]['initialReviews']}
            currentUserId={user?.id ?? ''}
            isAdmin={isAdmin}
          />
        </section>

        {/* 삭제 (관리자) */}
        {isAdmin && <DeleteRestaurantButton restaurantId={id} />}
      </main>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 text-zinc-400 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-[#1B4332] underline underline-offset-2">
            {value}
          </a>
        ) : (
          <p className="text-sm text-zinc-700">{value}</p>
        )}
      </div>
    </div>
  )
}
