import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin, Star } from 'lucide-react'
import BackButton from '@/components/BackButton'


const PRICE_LABEL: Record<number, string> = { 1: '₩', 2: '₩₩', 3: '₩₩₩', 4: '₩₩₩₩' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function UserProfilePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const [{ data: profile }, { data: restaurants }, { data: reviews }] = await Promise.all([
    supabase.from('profiles').select('name, created_at').eq('id', id).single(),
    supabase
      .from('restaurants')
      .select('id, name, category, address, road_address, price_range')
      .eq('created_by', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, rating, content, created_at, restaurants(id, name)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!profile) notFound()

  const isMe = user.id === id

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <BackButton />
        <h1 className="text-base font-semibold text-[#1B4332]">
          {isMe ? '내 프로필' : `${profile.name}님의 프로필`}
        </h1>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 md:px-8 max-w-lg mx-auto w-full gap-8">
        {/* 프로필 */}
        <section className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-full bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332] font-semibold text-lg">
            {profile.name?.[0] ?? '?'}
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-800">{profile.name ?? '이름 없음'}</p>
            <p className="text-xs text-zinc-400">
              {new Date(profile.created_at).toLocaleDateString('ko-KR')} 가입
            </p>
          </div>
        </section>

        {/* 등록한 맛집 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-700">
            등록한 맛집 <span className="text-zinc-400 font-normal">({restaurants?.length ?? 0})</span>
          </h2>
          {!restaurants || restaurants.length === 0 ? (
            <p className="text-sm text-zinc-400">등록한 맛집이 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {restaurants.map((r) => (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.id}`}
                  className="flex items-center justify-between px-4 py-3 border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{r.name}</p>
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{r.road_address || r.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {r.price_range && (
                      <span className="text-xs text-zinc-400">{PRICE_LABEL[r.price_range]}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium">
                      {r.category}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 작성한 리뷰 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-700">
            작성한 리뷰 <span className="text-zinc-400 font-normal">({reviews?.length ?? 0})</span>
          </h2>
          {!reviews || reviews.length === 0 ? (
            <p className="text-sm text-zinc-400">작성한 리뷰가 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {reviews.map((review) => {
                const restaurant = Array.isArray(review.restaurants)
                  ? review.restaurants[0]
                  : review.restaurants
                return (
                  <Link
                    key={review.id}
                    href={restaurant ? `/restaurants/${restaurant.id}` : '#'}
                    className="flex flex-col gap-1.5 px-4 py-3 border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-800 truncate">
                        {restaurant?.name ?? '알 수 없는 식당'}
                      </p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1,2,3,4,5].map((s) => (
                          <Star
                            key={s}
                            size={11}
                            className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-200 fill-zinc-200'}
                          />
                        ))}
                      </div>
                    </div>
                    {review.content && (
                      <p className="text-xs text-zinc-500 line-clamp-2">{review.content}</p>
                    )}
                    <p className="text-xs text-zinc-300">
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
