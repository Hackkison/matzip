import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')
  if (!query || query.length < 2) return NextResponse.json({ documents: [] })

  const apiKey = process.env.KAKAO_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Kakao API key not configured' }, { status: 500 })

  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('size', '15')

  const rect = request.nextUrl.searchParams.get('rect')
  if (rect) url.searchParams.set('rect', rect)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })
  const data = await res.json()

  const documents = (data.documents ?? []).filter(
    (d: { category_group_code: string }) =>
      d.category_group_code === 'FD6' || d.category_group_code === 'CE7'
  )

  return NextResponse.json({ documents })
}
