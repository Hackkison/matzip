import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Star, Flag, Headphones } from 'lucide-react'
import AdminDeleteButton from '@/components/AdminDeleteButton'
import AdminRequestActions from '@/components/AdminRequestActions'
import AdminInquiryReply from '@/components/AdminInquiryReply'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  // 관리자가 아니면 메인으로 이동
  if (!profile?.is_admin) redirect('/map')

  // 서비스 롤로 전체 문의 조회 (RLS 우회)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: restaurants }, { data: reviews }, { data: requests }, { data: inquiries }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, category, road_address, address, created_at, profiles(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, rating, content, created_at, restaurant_id, user_id, restaurants(name), profiles(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('review_delete_requests')
      .select('id, reason, created_at, status, requester_id, reviews(id, content, rating, restaurant_id, restaurants(name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    serviceClient
      .from('inquiries')
      .select('id, type, title, content, created_at, admin_reply, replied_at, user_id')
      .order('created_at', { ascending: false }),
  ])

  // requester_id → profiles 별도 조회 (FK가 auth.users를 참조해 자동 join 불가)
  const requesterIds = [...new Set((requests ?? []).map((r) => r.requester_id))]
  const { data: requesterProfiles } = requesterIds.length > 0
    ? await supabase.from('profiles').select('id, name').in('id', requesterIds)
    : { data: [] as { id: string; name: string }[] }
  const profileMap = Object.fromEntries((requesterProfiles ?? []).map((p) => [p.id, p.name]))

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href="/map" className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-base font-semibold text-[#1B4332]">관리자 콘텐츠 관리</h1>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 md:px-8 max-w-3xl mx-auto w-full gap-10">

        {/* 식당 관리 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 mb-3">
            식당 관리 ({restaurants?.length ?? 0})
          </h2>
          {!restaurants || restaurants.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">등록된 식당이 없어요</p>
          ) : (
            <div className="flex flex-col gap-1">
              {restaurants.map((r) => {
                const creatorName = Array.isArray(r.profiles)
                  ? r.profiles[0]?.name
                  : (r.profiles as { name: string } | null)?.name
                const address = r.road_address || r.address
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-2.5 border border-zinc-100 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/restaurants/${r.id}`}
                          className="text-sm font-medium text-zinc-800 hover:text-[#1B4332] truncate"
                        >
                          {r.name}
                        </Link>
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#1B4332]/10 text-[#1B4332] text-xs">
                          {r.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {address} · 등록자: {creatorName ?? '알 수 없음'} ·{' '}
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <AdminDeleteButton
                      apiUrl={`/api/restaurants/${r.id}`}
                      confirmMessage={`"${r.name}"을(를) 삭제할까요? 관련 리뷰도 모두 삭제됩니다.`}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 리뷰 관리 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 mb-3">
            리뷰 관리 ({reviews?.length ?? 0})
          </h2>
          {!reviews || reviews.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">작성된 리뷰가 없어요</p>
          ) : (
            <div className="flex flex-col gap-1">
              {reviews.map((rv) => {
                const restaurantName = Array.isArray(rv.restaurants)
                  ? rv.restaurants[0]?.name
                  : (rv.restaurants as { name: string } | null)?.name
                const reviewerName = Array.isArray(rv.profiles)
                  ? rv.profiles[0]?.name
                  : (rv.profiles as { name: string } | null)?.name
                return (
                  <div
                    key={rv.id}
                    className="flex items-center gap-3 px-3 py-2.5 border border-zinc-100 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/restaurants/${rv.restaurant_id}`}
                          className="text-sm font-medium text-zinc-800 hover:text-[#1B4332] truncate"
                        >
                          {restaurantName ?? '삭제된 식당'}
                        </Link>
                        <span className="shrink-0 flex items-center gap-0.5 text-xs text-zinc-400">
                          <Star size={10} className="text-yellow-400 fill-yellow-400" />
                          {rv.rating}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {reviewerName ?? '알 수 없음'} ·{' '}
                        {rv.content ? rv.content.slice(0, 40) + (rv.content.length > 40 ? '…' : '') : '(내용 없음)'} ·{' '}
                        {new Date(rv.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <AdminDeleteButton
                      apiUrl={`/api/reviews/${rv.id}`}
                      confirmMessage="이 리뷰를 삭제할까요?"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 리뷰 삭제 요청 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
            <Flag size={14} className="text-orange-400" />
            삭제 요청 ({requests?.length ?? 0})
          </h2>
          {!requests || requests.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">처리 대기 중인 요청이 없어요</p>
          ) : (
            <div className="flex flex-col gap-1">
              {requests.map((req) => {
                const review = Array.isArray(req.reviews) ? req.reviews[0] : req.reviews as {
                  id: string; content: string; rating: number; restaurant_id: string; restaurants: { name: string } | { name: string }[] | null
                } | null
                const requesterName = profileMap[req.requester_id] ?? '알 수 없음'
                const restaurantName = review
                  ? (Array.isArray(review.restaurants) ? review.restaurants[0]?.name : (review.restaurants as { name: string } | null)?.name)
                  : null
                return (
                  <div key={req.id} className="flex items-start gap-3 px-3 py-3 border border-orange-100 bg-orange-50/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-zinc-700">
                          {requesterName}
                        </span>
                        <span className="text-xs text-zinc-400">→</span>
                        {review && (
                          <Link
                            href={`/restaurants/${review.restaurant_id}`}
                            className="text-xs font-medium text-[#1B4332] hover:underline truncate"
                          >
                            {restaurantName ?? '삭제된 식당'} ★{review.rating}
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        리뷰: {review?.content ? review.content.slice(0, 40) + (review.content.length > 40 ? '…' : '') : '(내용 없음)'}
                      </p>
                      <p className="text-xs text-orange-600 mt-0.5">사유: {req.reason}</p>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    {review && <AdminRequestActions requestId={req.id} />}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 고객센터 문의 */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
            <Headphones size={14} className="text-[#1B4332]" />
            고객센터 문의 ({inquiries?.length ?? 0})
          </h2>
          {!inquiries || inquiries.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">접수된 문의가 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {inquiries.map(inq => (
                <div
                  key={inq.id}
                  className="px-3 py-3 border border-zinc-100 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      inq.type === 'bug' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                    }`}>
                      {inq.type === 'bug' ? '오류 신고' : '건의사항'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    {inq.admin_reply && (
                      <span className="ml-auto text-[10px] font-semibold text-[#1B4332] bg-[#1B4332]/10 px-1.5 py-0.5 rounded-full">
                        답변 완료
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-zinc-800 mb-0.5">{inq.title}</p>
                  <p className="text-xs text-zinc-500 whitespace-pre-line">{inq.content}</p>
                  {inq.admin_reply && (
                    <div className="mt-2 bg-[#1B4332]/5 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-[#1B4332] mb-0.5">기존 답변</p>
                      <p className="text-xs text-zinc-600">{inq.admin_reply}</p>
                    </div>
                  )}
                  <AdminInquiryReply inquiryId={inq.id} existingReply={inq.admin_reply ?? null} />
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
