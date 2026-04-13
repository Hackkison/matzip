import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import LogoutButton from '@/components/logout-button'
import DeleteAccountButton from '@/components/DeleteAccountButton'
import DarkModeToggle from '@/components/DarkModeToggle'
import PasswordChangeForm from '@/components/PasswordChangeForm'
import LinkGoogleButton from '@/components/LinkGoogleButton'

export default async function MyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: myRestaurants }, { data: myReviews }] = await Promise.all([
    supabase.from('profiles').select('name, is_admin').eq('id', user.id).single(),
    supabase
      .from('restaurants')
      .select('id, name, category, address, road_address')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, rating, content, created_at, restaurant_id, restaurants(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  // 관리자인 경우 미처리 삭제 요청 수 조회
  let pendingRequestCount = 0
  if (profile?.is_admin) {
    const { count } = await supabase
      .from('review_delete_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingRequestCount = count ?? 0
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="flex items-center gap-3 bg-[#1B4332] px-4 py-4 md:px-8">
        <div className="flex-1">
          <h1 className="text-base font-semibold text-white">마이페이지</h1>
        </div>
        <LogoutButton />
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 md:px-8 max-w-lg mx-auto w-full gap-8">
        {/* 프로필 */}
        <section className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-zinc-800">{profile?.name ?? '닉네임 없음'}</p>
            <p className="text-xs text-zinc-400">{user.email}</p>
            {profile?.is_admin && (
              <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-[#1B4332] font-medium hover:underline">
                관리자 콘텐츠 관리 →
                {pendingRequestCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
                  </span>
                )}
              </Link>
            )}
          </div>
          <Link
            href="/profile/setup"
            className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-500 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
          >
            닉네임 변경
          </Link>
        </section>

        {/* 내가 등록한 맛집 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 mb-3">
            내가 등록한 맛집 ({myRestaurants?.length ?? 0})
          </h2>
          {(!myRestaurants || myRestaurants.length === 0) ? (
            <p className="text-sm text-zinc-400 text-center py-4">등록한 맛집이 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {myRestaurants.map((r) => (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.id}`}
                  className="flex items-start gap-3 px-3 py-3 border border-zinc-100 rounded-lg hover:border-[#1B4332]/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{r.name}</p>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                      <MapPin size={10} />
                      <span className="truncate">{r.road_address || r.address}</span>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs">
                    {r.category}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 내가 쓴 리뷰 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 mb-3">
            내가 쓴 리뷰 ({myReviews?.length ?? 0})
          </h2>
          {(!myReviews || myReviews.length === 0) ? (
            <p className="text-sm text-zinc-400 text-center py-4">작성한 리뷰가 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {myReviews.map((rv) => {
                const restName = Array.isArray(rv.restaurants)
                  ? rv.restaurants[0]?.name
                  : (rv.restaurants as { name: string } | null)?.name
                return (
                  <Link
                    key={rv.id}
                    href={`/restaurants/${rv.restaurant_id}`}
                    className="flex flex-col gap-1 px-3 py-3 border border-zinc-100 rounded-lg hover:border-[#1B4332]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-zinc-800">{restName ?? '삭제된 맛집'}</p>
                      <span className="flex items-center gap-0.5 text-xs text-zinc-400">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" />
                        {rv.rating}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{rv.content}</p>
                    <p className="text-xs text-zinc-300">
                      {new Date(rv.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
        {/* 설정 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 mb-3">설정</h2>
          <div className="flex flex-col gap-2">
            <DarkModeToggle />
            {/* 이메일 로그인 사용자만 비밀번호 변경 및 구글 연동 노출 */}
            {user.app_metadata?.provider === 'email' && (
              <>
                <PasswordChangeForm email={user.email!} />
                <LinkGoogleButton />
              </>
            )}
          </div>
        </section>

        {/* 회원 탈퇴 */}
        <section className="border-t border-zinc-100 pt-6">
          <DeleteAccountButton />
        </section>
      </main>
    </div>
  )
}
