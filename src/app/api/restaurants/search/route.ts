import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RADIUS = 0.15 // 위경도 약 ±15km 반경

// 실시간 맛집 검색 (드롭다운용)
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const lat = parseFloat(request.nextUrl.searchParams.get('lat') ?? '')
  const lng = parseFloat(request.nextUrl.searchParams.get('lng') ?? '')

  if (q.length < 1) return NextResponse.json([])

  let query = supabase
    .from('restaurants')
    .select('id, name, category, address, road_address')
    .or(`name.ilike.%${q}%,address.ilike.%${q}%,road_address.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(8)

  // GPS 좌표가 있으면 현재 위치 기준 반경 필터 적용
  if (!isNaN(lat) && !isNaN(lng)) {
    query = query
      .gte('lat', lat - RADIUS)
      .lte('lat', lat + RADIUS)
      .gte('lng', lng - RADIUS)
      .lte('lng', lng + RADIUS)
  }

  const { data, error } = await query
  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data ?? [])
}
