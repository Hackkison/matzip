import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')

  if (!query || query.length < 2) {
    return NextResponse.json({ documents: [] })
  }

  const apiKey = process.env.KAKAO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Kakao API key not configured' }, { status: 500 })
  }

  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('size', '15')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })

  const data = await res.json()

  // 음식 관련 카테고리만 필터링 (FD6: 음식점, CE7: 카페)
  let documents = (data.documents ?? []).filter(
    (d: { category_group_code: string }) =>
      d.category_group_code === 'FD6' || d.category_group_code === 'CE7'
  )

  // 선택된 지역으로 필터링 (공백 제거 후 비교)
  const municipalities = request.nextUrl.searchParams.get('municipalities')
  if (municipalities) {
    const regions = municipalities.split(',').filter(Boolean)
    documents = documents.filter((d: { address_name: string; road_address_name: string }) => {
      const addr = (d.road_address_name || d.address_name).replace(/\s/g, '')
      return regions.some((r) => addr.includes(r))
    })
  }

  return NextResponse.json({ documents })
}
