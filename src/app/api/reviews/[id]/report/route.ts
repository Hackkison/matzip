import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/ratelimit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const schema = z.object({
  reason: z.string().min(1, '사유를 입력해주세요').max(200, '200자 이하로 입력해주세요'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(request)
  if (rl) return rl

  const { id } = await params
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('review_delete_requests')
    .insert({ review_id: id, requester_id: user.id, reason: result.data.reason })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 삭제 요청한 리뷰입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: '요청 중 오류가 발생했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
