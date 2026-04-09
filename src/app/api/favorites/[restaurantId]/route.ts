import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/ratelimit'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getSupabase() {
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

// 즐겨찾기 추가
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const rl = await checkRateLimit(req)
  if (rl) return rl

  const { restaurantId } = await params
  if (!UUID_REGEX.test(restaurantId)) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  const supabase = await getSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, restaurant_id: restaurantId })

  if (error) return NextResponse.json({ error: '추가 실패' }, { status: 500 })
  return NextResponse.json({ success: true })
}

// 즐겨찾기 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const rl = await checkRateLimit(req)
  if (rl) return rl

  const { restaurantId } = await params
  if (!UUID_REGEX.test(restaurantId)) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  const supabase = await getSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('restaurant_id', restaurantId)

  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  return NextResponse.json({ success: true })
}
