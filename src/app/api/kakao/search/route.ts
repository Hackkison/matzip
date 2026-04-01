import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

interface GeoFeature {
  properties: { name: string; code: string }
  geometry: { type: string; coordinates: number[][][][] }
}

function getBbox(features: GeoFeature[]): string | null {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const f of features) {
    const polys =
      f.geometry.type === 'MultiPolygon'
        ? f.geometry.coordinates
        : [f.geometry.coordinates]
    for (const poly of polys) {
      for (const coord of poly[0]) {
        const lon = coord[0] as number
        const lat = coord[1] as number
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  if (!isFinite(minLon)) return null
  return `${minLon},${minLat},${maxLon},${maxLat}`
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')
  if (!query || query.length < 2) return NextResponse.json({ documents: [] })

  const apiKey = process.env.KAKAO_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Kakao API key not configured' }, { status: 500 })

  // 지역 bounding box 계산
  const municipalities = request.nextUrl.searchParams.get('municipalities')
  const codes = request.nextUrl.searchParams.get('codes')
  let rect: string | null = null

  if (municipalities && codes) {
    const provinceCode = codes.split(',')[0].slice(0, 2)
    const names = municipalities.split(',').filter(Boolean)
    try {
      const geoPath = join(process.cwd(), 'public', 'maps', 'municipalities', `${provinceCode}.json`)
      const geo = JSON.parse(readFileSync(geoPath, 'utf8'))
      const matched = geo.features.filter((f: GeoFeature) => names.includes(f.properties.name))
      rect = getBbox(matched)
    } catch {
      // GeoJSON 없으면 bbox 없이 검색
    }
  }

  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('size', '15')
  if (rect) url.searchParams.set('rect', rect)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })
  const data = await res.json()

  // 음식점/카페만 필터링
  const documents = (data.documents ?? []).filter(
    (d: { category_group_code: string }) =>
      d.category_group_code === 'FD6' || d.category_group_code === 'CE7'
  )

  return NextResponse.json({ documents })
}
