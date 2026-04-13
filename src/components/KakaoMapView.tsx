'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'
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

interface ManualRestaurant {
  id: string
  name: string
  address: string
  phone: string | null
  lat: number
  lng: number
  category: string
}

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        Map: new (container: HTMLElement, options: object) => KakaoMap
        LatLng: new (lat: number, lng: number) => object
        Marker: new (options: object) => KakaoMarker
        MarkerImage: new (src: string, size: object) => object
        Size: new (width: number, height: number) => object
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

// 리뷰 있는 맛집용 녹색 SVG 마커 이미지 URL 생성
function createReviewMarkerImage(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24S28 24.5 28 14C28 6.27 21.73 0 14 0z" fill="#1B4332"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
    <circle cx="14" cy="14" r="3" fill="#1B4332"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const REVIEW_MARKER_SRC = createReviewMarkerImage()
const REVIEW_MARKER_SIZE = { width: 28, height: 38 }

export default function KakaoMapView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<KakaoMap | null>(null)
  const markersRef = useRef<KakaoMarker[]>([])
  const manualMarkersRef = useRef<KakaoMarker[]>([])
  const myMarkerRef = useRef<KakaoMarker | null>(null)
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null)

  const [places, setPlaces] = useState<Place[]>([])
  const [manualRestaurants, setManualRestaurants] = useState<ManualRestaurant[]>([])
  // kakao_id → 우리 DB restaurant id 매핑 (상태로 관리하여 마커 타이밍 보장)
  const [registeredMap, setRegisteredMap] = useState<Map<string, string>>(new Map())
  // 리뷰가 1개 이상 있는 restaurant id 집합
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [gpsError, setGpsError] = useState(false)

  const supabase = createClient()

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
      const manualList: ManualRestaurant[] = (manualRes.data ?? []) as ManualRestaurant[]

      setPlaces(docs)
      setManualRestaurants(manualList)

      // 우리 DB에 등록된 카카오 식당 조회
      let newRegisteredMap = new Map<string, string>()
      if (docs.length > 0) {
        const kakaoIds = docs.map((d: Place) => d.id)
        const { data: registered } = await supabase
          .from('restaurants')
          .select('id, kakao_id')
          .in('kakao_id', kakaoIds)
        for (const r of registered ?? []) {
          if (r.kakao_id) newRegisteredMap.set(r.kakao_id, r.id)
        }
      }
      setRegisteredMap(newRegisteredMap)

      // 리뷰 있는 맛집 조회 (카카오 등록 + 직접 등록 모두 포함)
      const allRestaurantIds = [
        ...newRegisteredMap.values(),
        ...manualList.map(r => r.id),
      ]
      if (allRestaurantIds.length > 0) {
        const { data: withReviews } = await supabase
          .from('reviews')
          .select('restaurant_id')
          .in('restaurant_id', allRestaurantIds)
        setReviewedIds(new Set(withReviews?.map(r => r.restaurant_id) ?? []))
      } else {
        setReviewedIds(new Set())
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

  // 카카오 API 검색 결과 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    if (infoWindowRef.current) infoWindowRef.current.close()

    places.forEach(place => {
      const restaurantId = registeredMap.get(place.id)
      const hasReview = restaurantId ? reviewedIds.has(restaurantId) : false

      // 리뷰 있는 맛집은 녹색 커스텀 마커 사용
      const markerOptions: Record<string, unknown> = {
        map: mapInstanceRef.current!,
        position: new window.kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x)),
        title: place.place_name,
      }
      if (hasReview) {
        markerOptions.image = new window.kakao.maps.MarkerImage(
          REVIEW_MARKER_SRC,
          new window.kakao.maps.Size(REVIEW_MARKER_SIZE.width, REVIEW_MARKER_SIZE.height)
        )
      }

      const marker = new window.kakao.maps.Marker(markerOptions)

      // 카카오 가게 정보를 URL 파라미터로 전달하여 등록 페이지에서 자동 선택
      const registerParams = new URLSearchParams({
        p_id: place.id,
        p_name: place.place_name,
        p_address: place.address_name,
        p_road: place.road_address_name,
        p_phone: place.phone,
        p_category: place.category_name,
        p_x: place.x,
        p_y: place.y,
      })
      const appLink = restaurantId
        ? `<a href="/restaurants/${restaurantId}" style="display:block;margin-top:6px;padding:4px 8px;background:#1B4332;color:#fff;font-size:11px;font-weight:600;border-radius:6px;text-align:center;text-decoration:none">리뷰 보러가기</a>`
        : `<a href="/restaurants/register?${registerParams.toString()}" style="display:block;margin-top:6px;padding:4px 8px;background:#f5f5f5;color:#52525b;font-size:11px;border-radius:6px;text-align:center;text-decoration:none">맛집 등록하기</a>`

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
  }, [places, registeredMap, reviewedIds])

  // 직접 등록 맛집 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return

    manualMarkersRef.current.forEach(m => m.setMap(null))
    manualMarkersRef.current = []

    manualRestaurants.forEach(r => {
      const hasReview = reviewedIds.has(r.id)

      // 직접 등록 맛집은 항상 커스텀 마커 (리뷰 유무로 색상 구분)
      const markerImage = new window.kakao.maps.MarkerImage(
        REVIEW_MARKER_SRC,
        new window.kakao.maps.Size(REVIEW_MARKER_SIZE.width, REVIEW_MARKER_SIZE.height)
      )
      // 리뷰 없으면 기본 마커로 대체 (직접 등록 맛집은 항상 녹색 핀 유지)
      const markerOptions: Record<string, unknown> = {
        map: mapInstanceRef.current!,
        position: new window.kakao.maps.LatLng(r.lat, r.lng),
        title: r.name,
        image: hasReview ? markerImage : undefined,
      }
      // image가 undefined면 기본 마커로 렌더링됨
      if (!hasReview) delete markerOptions.image

      const marker = new window.kakao.maps.Marker(markerOptions)

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
  }, [manualRestaurants, reviewedIds])

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
        {/* 마커 범례 */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-[#1B4332]" />
            리뷰 있음
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-[#3C8FE8]" />
            미등록
          </span>
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

      {/* 하단 목록 (최대 8개 미리보기) */}
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
