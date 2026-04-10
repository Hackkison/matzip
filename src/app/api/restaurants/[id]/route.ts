import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { checkRateLimit } from '@/lib/ratelimit'

// 공통: 세션 기반 supabase 클라이언트 생성
async function buildSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}

// 영업시간 업데이트 (등록자 또는 관리자)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(request)
  if (rl) return rl

  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  let body: { business_hours?: unknown; image_url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const supabase = await buildSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', id)
    .single()

  if (!restaurant) return NextResponse.json({ error: '식당을 찾을 수 없습니다' }, { status: 404 })

  // 대표 사진 변경 — 관리자 전용
  if ('image_url' in body) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

    const { error } = await supabase
      .from('restaurants')
      .update({ image_url: body.image_url })
      .eq('id', id)
    if (error) return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // 영업시간 업데이트 — 로그인 사용자 누구나
  const { error } = await supabase
    .from('restaurants')
    .update({ business_hours: body.business_hours })
    .eq('id', id)

  if (error) {
    console.error('영업시간 업데이트 오류:', error)
    return NextResponse.json({ error: '업데이트 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(request)
  if (rl) return rl

  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const supabase = await buildSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 소유자 및 관리자 확인
  const [{ data: restaurant }, { data: profile }] = await Promise.all([
    supabase.from('restaurants').select('created_by').eq('id', id).single(),
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
  ])

  if (!restaurant) return NextResponse.json({ error: '식당을 찾을 수 없습니다' }, { status: 404 })

  const isAdmin = profile?.is_admin === true
  if (!isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  // 서비스 롤 클라이언트로 삭제 (RLS 우회 — 리뷰 FK 제약 해결)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: reviewsError } = await admin.from('reviews').delete().eq('restaurant_id', id)
  if (reviewsError) {
    console.error('리뷰 삭제 오류:', reviewsError)
    return NextResponse.json({ error: '리뷰 삭제 실패' }, { status: 500 })
  }

  const { error: restaurantError } = await admin.from('restaurants').delete().eq('id', id)
  if (restaurantError) {
    console.error('맛집 삭제 오류:', restaurantError)
    return NextResponse.json({ error: '맛집 삭제 실패' }, { status: 500 })
  }

  revalidateTag('restaurants', {})
  return NextResponse.json({ success: true })
}
