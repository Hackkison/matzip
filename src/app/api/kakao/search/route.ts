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

  const baseUrl = 'https://dapi.kakao.com/v2/local/search/keyword.json'
  const headers = { Authorization: `KakaoAK ${apiKey}` }

  const [fd6, ce7] = await Promise.all(
    ['FD6', 'CE7'].map((code) => {
      const url = new URL(baseUrl)
      url.searchParams.set('query', query)
      url.searchParams.set('category_group_code', code)
      url.searchParams.set('size', '10')
      return fetch(url.toString(), { headers }).then((r) => r.json())
    })
  )

  const documents = [...(fd6.documents ?? []), ...(ce7.documents ?? [])]
  return NextResponse.json({ documents })
}
