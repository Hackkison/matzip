import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const schema = z.object({ action: z.enum(['approved', 'rejected']) })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params
  if (!UUID_REGEX.test(requestId)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  // 관리자 여부 확인
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  // 서비스 롤로 처리
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: req } = await admin
    .from('review_delete_requests')
    .select('review_id')
    .eq('id', requestId)
    .single()

  if (!req) return NextResponse.json({ error: '요청을 찾을 수 없습니다' }, { status: 404 })

  // 승인 시 리뷰 삭제
  if (result.data.action === 'approved') {
    const { error: reviewErr } = await admin
      .from('reviews').delete().eq('id', req.review_id)
    if (reviewErr) return NextResponse.json({ error: '리뷰 삭제 실패' }, { status: 500 })
  }

  // 요청 상태 업데이트
  const { error: updateErr } = await admin
    .from('review_delete_requests')
    .update({ status: result.data.action })
    .eq('id', requestId)

  if (updateErr) return NextResponse.json({ error: '상태 업데이트 실패' }, { status: 500 })

  return NextResponse.json({ success: true })
}
