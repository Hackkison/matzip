import { NextRequest, NextResponse } from 'next/server'
import { checkKakaoRateLimit } from '@/lib/ratelimit'

export async function GET(request: NextRequest) {
  const rl = await checkKakaoRateLimit(request)
  if (rl) return rl

  const address = request.nextUrl.searchParams.get('address')
  if (!address) return NextResponse.json({ lat: 0, lng: 0 })

  const apiKey = process.env.KAKAO_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Kakao API key not configured' }, { status: 500 })

  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json')
  url.searchParams.set('query', address)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })
  const data = await res.json()

  const doc = data.documents?.[0]
  if (!doc) return NextResponse.json({ lat: 0, lng: 0 })

  return NextResponse.json({
    lat: parseFloat(doc.y),
    lng: parseFloat(doc.x),
  })
}
