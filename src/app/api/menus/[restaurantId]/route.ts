import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/ratelimit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params
  if (!UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('menus')
    .select('id, name, price, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const rl = await checkRateLimit(request)
  if (rl) return rl

  const { restaurantId } = await params
  if (!UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const price = typeof body.price === 'number' ? body.price : null

  if (!name) return NextResponse.json({ error: '메뉴명을 입력해주세요' }, { status: 400 })
  if (name.length > 100) return NextResponse.json({ error: '메뉴명이 너무 깁니다' }, { status: 400 })
  if (price !== null && (price < 0 || price > 1_000_000)) {
    return NextResponse.json({ error: '가격이 올바르지 않습니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('menus')
    .insert({ restaurant_id: restaurantId, name, price })
    .select('id, name, price, created_at')
    .single()

  if (error) return NextResponse.json({ error: '등록 실패' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const rl = await checkRateLimit(request)
  if (rl) return rl

  const { restaurantId } = await params
  if (!UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const menuId = new URL(request.url).searchParams.get('menuId')
  if (!menuId || !UUID_RE.test(menuId)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 삭제는 관리자만 가능
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', menuId)
    .eq('restaurant_id', restaurantId)

  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  return NextResponse.json({ success: true })
}
