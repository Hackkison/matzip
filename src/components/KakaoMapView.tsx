'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LocateFixed } from 'lucide-react'

interface Place {
  id: string
  place_name: string
  category_name: string
  phone: string
  address_name: string
  road_address_name: string
  x: string
  y: string
  place_url: string
}

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        Map: new (container: HTMLElement, options: object) => KakaoMap
        LatLng: new (lat: number, lng: number) => object
        Marker: new (options: object) => KakaoMarker
        InfoWindow: new (options: object) => KakaoInfoWindow
        event: {
          addListener: (target: object, type: string, handler: () => void) => void
        }
      }
    }
  }
}

interface KakaoMap {
  getBounds: () => KakaoBounds
  getCenter: () => object
  setCenter: (pos: object) => void
  setLevel: (level: number) => void
}
interface KakaoBounds {
  getSouthWest: () => KakaoLatLng
  getNorthEast: () => KakaoLatLng
}
interface KakaoLatLng {
  getLat: () => number
  getLng: () => number
}
interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void
}
interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void
  close: () => void
}

export default function KakaoMapView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<KakaoMap | null>(null)
  const markersRef = useRef<KakaoMarker[]>([])
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null)
  interface ManualRestaurant {
    id: string
    name: string
    address: string
    phone: string | null
    lat: number
    lng: number
    category: string
  }

  const [places, setPlaces] = useState<Place[]>([])
  const [manualRestaurants, setManualRestaurants] = useState<ManualRestaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [gpsError, setGpsError] = useState(false)
  const myMarkerRef = useRef<KakaoMarker | null>(null)
  const manualMarkersRef = useRef<KakaoMarker[]>([])
  const supabase = createClient()
  // kakao_id → 우리 DB restaurant id 매핑
  const registeredRef = useRef<Map<string, string>>(new Map())

  const searchInBounds = useCallback(async () => {
    if (!mapInstanceRef.current) return
    const bounds = mapInstanceRef.current.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    const rect = `${sw.getLng()},${sw.getLat()},${ne.getLng()},${ne.getLat()}`

    setLoading(true)
    try {
      const [kakaoRes, manualRes] = await Promise.all([
        fetch(`/api/kakao/search?query=음식점&rect=${rect}`).then(r => r.json()),
        // 직접 등록 맛집 (kakao_id 없음, 좌표 있음) 현재 지도 영역 내 조회
        supabase
          .from('restaurants')
          .select('id, name, address, phone, lat, lng, category')
          .is('kakao_id', null)
          .neq('lat', 0)
          .gte('lat', sw.getLat())
          .lte('lat', ne.getLat())
          .gte('lng', sw.getLng())
          .lte('lng', ne.getLng()),
      ])

      const docs: Place[] = kakaoRes.documents ?? []
      setPlaces(docs)
      setManualRestaurants((manualRes.data ?? []) as ManualRestaurant[])

      // 우리 DB에 등록된 카카오 식당 조회
      if (docs.length > 0) {
        const kakaoIds = docs.map((d: Place) => d.id)
        const { data: registered } = await supabase
          .from('restaurants')
          .select('id, kakao_id')
          .in('kakao_id', kakaoIds)
        const map = new Map<string, string>()
        for (const r of registered ?? []) {
          if (r.kakao_id) map.set(r.kakao_id, r.id)
        }
        registeredRef.current = map
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const moveToMyLocation = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return
    const pos = new window.kakao.maps.LatLng(lat, lng)
    mapInstanceRef.current.setCenter(pos)
    mapInstanceRef.current.setLevel(4)

    // 내 위치 마커
    if (myMarkerRef.current) myMarkerRef.current.setMap(null)
    myMarkerRef.current = new window.kakao.maps.Marker({
      map: mapInstanceRef.current,
      position: pos,
      title: '내 위치',
    })
  }, [])

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsError(true); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => moveToMyLocation(pos.coords.latitude, pos.coords.longitude),
      () => setGpsError(true),
      { timeout: 8000 }
    )
  }, [moveToMyLocation])

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.kakao?.maps) return

    window.kakao.maps.load(() => {
      const map = new window.kakao.maps.Map(mapRef.current!, {
        center: new window.kakao.maps.LatLng(36.5, 127.8),
        level: 13,
      })
      mapInstanceRef.current = map

      window.kakao.maps.event.addListener(map, 'idle', searchInBounds)

      // GPS로 내 위치 자동 이동
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => moveToMyLocation(pos.coords.latitude, pos.coords.longitude),
          () => searchInBounds(), // GPS 실패 시 현재 영역 검색
          { timeout: 8000 }
        )
      } else {
        searchInBounds()
      }
    })
  }, [searchInBounds, moveToMyLocation])

  // 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    if (infoWindowRef.current) infoWindowRef.current.close()

    places.forEach(place => {
      const marker = new window.kakao.maps.Marker({
        map: mapInstanceRef.current!,
        position: new window.kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x)),
        title: place.place_name,
      })

      const restaurantId = registeredRef.current.get(place.id)
      const appLink = restaurantId
        ? `<a href="/restaurants/${restaurantId}" style="display:block;margin-top:6px;padding:4px 8px;background:#1B4332;color:#fff;font-size:11px;font-weight:600;border-radius:6px;text-align:center;text-decoration:none">리뷰 보러가기</a>`
        : `<a href="/restaurants/register" style="display:block;margin-top:6px;padding:4px 8px;background:#f5f5f5;color:#52525b;font-size:11px;border-radius:6px;text-align:center;text-decoration:none">맛집 등록하기</a>`

      const content = `
        <div style="padding:10px 14px;min-width:160px;font-family:inherit">
          <p style="font-size:13px;font-weight:600;margin:0 0 2px">${place.place_name}</p>
          <p style="font-size:11px;color:#71717a;margin:0 0 2px">${place.category_name.split(' > ').pop()}</p>
          ${place.phone ? `<p style="font-size:11px;color:#71717a;margin:0 0 4px">${place.phone}</p>` : ''}
          ${appLink}
          <a href="${place.place_url}" target="_blank" style="display:block;margin-top:4px;font-size:10px;color:#a1a1aa;text-align:center">카카오맵에서 보기</a>
        </div>
      `
      const infoWindow = new window.kakao.maps.InfoWindow({ content, removable: true })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (infoWindowRef.current) infoWindowRef.current.close()
        infoWindow.open(mapInstanceRef.current!, marker)
        infoWindowRef.current = infoWindow
      })

      markersRef.current.push(marker)
    })
  }, [places])

  // 직접 등록 맛집 마커
  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return

    manualMarkersRef.current.forEach(m => m.setMap(null))
    manualMarkersRef.current = []

    manualRestaurants.forEach(r => {
      const marker = new window.kakao.maps.Marker({
        map: mapInstanceRef.current!,
        position: new window.kakao.maps.LatLng(r.lat, r.lng),
        title: r.name,
      })

      const content = `
        <div style="padding:10px 14px;min-width:160px;font-family:inherit">
          <p style="font-size:13px;font-weight:600;margin:0 0 2px">${r.name}</p>
          <p style="font-size:11px;color:#71717a;margin:0 0 2px">${r.category}</p>
          ${r.phone ? `<p style="font-size:11px;color:#71717a;margin:0 0 4px">${r.phone}</p>` : ''}
          <a href="/restaurants/${r.id}" style="display:block;margin-top:6px;padding:4px 8px;background:#1B4332;color:#fff;font-size:11px;font-weight:600;border-radius:6px;text-align:center;text-decoration:none">리뷰 보러가기</a>
        </div>
      `
      const infoWindow = new window.kakao.maps.InfoWindow({ content, removable: true })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (infoWindowRef.current) infoWindowRef.current.close()
        infoWindow.open(mapInstanceRef.current!, marker)
        infoWindowRef.current = infoWindow
      })

      manualMarkersRef.current.push(marker)
    })
  }, [manualRestaurants])

  useEffect(() => {
    if (sdkReady) initMap()
  }, [sdkReady, initMap])

  return (
    <div className="flex flex-col h-screen bg-white">
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`}
        onLoad={() => setSdkReady(true)}
      />

      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8 shrink-0">
        <div className="flex-1">
          <h1 className="text-base font-semibold text-[#1B4332]">주변 맛집 지도</h1>
          {loading
            ? <p className="text-xs text-zinc-400">검색 중...</p>
            : places.length > 0 && <p className="text-xs text-zinc-400">음식점 {places.length}개</p>
          }
        </div>
        <button
          onClick={requestGps}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
        >
          <LocateFixed size={14} />
          내 위치
        </button>
      </header>
      {gpsError && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 text-center">
          위치 권한이 필요합니다. 브라우저 설정에서 허용해주세요.
        </div>
      )}

      <div ref={mapRef} className="flex-1 w-full" style={{ touchAction: 'none' }} />

      {/* 하단 목록 (최대 5개 미리보기) */}
      {places.length > 0 && (
        <div className="shrink-0 border-t border-zinc-100 overflow-x-auto">
          <div className="flex gap-3 px-4 py-3">
            {places.slice(0, 8).map(p => (
              <a
                key={p.id}
                href={p.place_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex flex-col gap-0.5 px-3 py-2.5 border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 min-w-[130px]"
              >
                <p className="text-xs font-semibold text-zinc-800 truncate max-w-[120px]">{p.place_name}</p>
                <p className="text-[10px] text-zinc-400">{p.category_name.split(' > ').pop()}</p>
                {p.phone && <p className="text-[10px] text-zinc-300">{p.phone}</p>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
