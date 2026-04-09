'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, MapPin, Navigation } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Haversine 거리 계산 (km 반환)
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

interface Restaurant {
  id: string
  name: string
  category: string
  address: string
  road_address: string | null
  lat: number
  lng: number
  distance: number
}

type Status = 'locating' | 'loading' | 'done' | 'error'

const RADIUS_OPTIONS = [1, 3, 5, 10]

export default function NearbyPage() {
  const [status, setStatus] = useState<Status>('locating')
  const [errorMsg, setErrorMsg] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [radius, setRadius] = useState(3)
  const supabase = createClient()

  const findNearby = useCallback(async (lat: number, lng: number, r: number) => {
    setStatus('loading')
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, category, address, road_address, lat, lng')
      .neq('lat', 0)
      .neq('lng', 0)

    const withDistance: Restaurant[] = (data ?? [])
      .map((rest) => ({ ...rest, distance: getDistance(lat, lng, rest.lat, rest.lng) }))
      .filter((rest) => rest.distance <= r)
      .sort((a, b) => a.distance - b.distance)

    setRestaurants(withDistance)
    setStatus('done')
  }, [supabase])

  const requestLocation = useCallback(() => {
    setStatus('locating')
    setErrorMsg('')
    if (!navigator.geolocation) {
      setErrorMsg('이 브라우저는 위치 기능을 지원하지 않습니다.')
      setStatus('error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(loc)
        findNearby(loc.lat, loc.lng, radius)
      },
      () => {
        setErrorMsg('위치 접근 권한이 거부됐습니다. 브라우저 설정에서 허용해주세요.')
        setStatus('error')
      },
      { timeout: 10000 }
    )
  }, [findNearby, radius])

  const handleRadiusChange = (r: number) => {
    setRadius(r)
    if (location) findNearby(location.lat, location.lng, r)
  }

  useEffect(() => {
    requestLocation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href="/map" className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-[#1B4332]">주변 맛집</h1>
          {status === 'done' && (
            <p className="text-xs text-zinc-400">반경 {radius}km 내 {restaurants.length}개</p>
          )}
        </div>
        {location && (
          <button
            onClick={requestLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
          >
            <Navigation size={13} />
            새로고침
          </button>
        )}
      </header>

      {/* 반경 필터 */}
      {status !== 'error' && (
        <div className="flex gap-2 px-4 pt-3 pb-2 border-b border-zinc-100">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              disabled={status === 'locating'}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                radius === r
                  ? 'bg-[#1B4332] text-white border-[#1B4332]'
                  : 'text-zinc-500 border-zinc-200 hover:border-zinc-400 disabled:opacity-40'
              }`}
            >
              {r}km
            </button>
          ))}
        </div>
      )}

      <main className="flex flex-1 flex-col px-4 py-4 md:px-8 max-w-lg mx-auto w-full gap-3">
        {(status === 'locating' || status === 'loading') && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
            <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">
              {status === 'locating' ? '위치 확인 중...' : '주변 맛집 검색 중...'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
            <p className="text-sm text-zinc-500">{errorMsg}</p>
            <button
              onClick={requestLocation}
              className="px-4 py-2 bg-[#1B4332] text-white rounded-lg text-sm"
            >
              다시 시도
            </button>
          </div>
        )}

        {status === 'done' && restaurants.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-20">
            <p className="text-zinc-400 text-sm">반경 {radius}km 내에 등록된 맛집이 없어요</p>
            <p className="text-zinc-300 text-xs">반경을 넓히거나 맛집을 직접 등록해보세요</p>
          </div>
        )}

        {status === 'done' && restaurants.map((r) => (
          <Link
            key={r.id}
            href={`/restaurants/${r.id}`}
            className="flex items-center gap-3 px-4 py-4 border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 hover:bg-zinc-50 transition-colors"
          >
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-800 leading-snug">{r.name}</p>
                <span className="px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium shrink-0">
                  {r.category}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{r.road_address || r.address}</span>
              </div>
            </div>
            {/* 거리 표시 */}
            <span className="shrink-0 text-xs font-semibold text-[#1B4332]">
              {formatDistance(r.distance)}
            </span>
          </Link>
        ))}
      </main>
    </div>
  )
}
