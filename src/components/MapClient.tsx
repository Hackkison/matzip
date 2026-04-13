'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Heart, Navigation, LogIn, Headphones } from 'lucide-react'
import { getCategoryStyle } from '@/lib/category'

const KoreaMap = dynamic(() => import('@/components/KoreaMap'), { ssr: false })
const RegionModal = dynamic(() => import('@/components/RegionModal'), { ssr: false })
const InquiryModal = dynamic(() => import('@/components/InquiryModal'), { ssr: false })

const CATEGORIES = ['전체', '한식', '중식', '일식', '양식', '디저트', '기타']
const CATEGORY_EMOJI: Record<string, string> = {
  '전체': '🗺️',
  '한식': '🍚',
  '중식': '🥟',
  '일식': '🍱',
  '양식': '🍝',
  '디저트': '🍰',
  '기타': '🍽️',
}

interface RecentRestaurant {
  id: string
  name: string
  category: string
  isFavorited: boolean
  thumbnail_url: string | null
}

interface Props {
  nickname: string | null
  restaurantCount: number
  recentRestaurants: RecentRestaurant[]
  isLoggedIn: boolean
}

export default function MapClient({ nickname, restaurantCount, recentRestaurants, isLoggedIn }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<{ code: string; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('전체')
  const [showInquiry, setShowInquiry] = useState(false)

  // 실시간 검색 상태
  interface SearchResult { id: string; name: string; category: string; address: string; road_address: string | null }
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const formRef = useRef<HTMLFormElement>(null)
  // 현재 위치 캐시 (검색 필터에 활용, 실패해도 무시)
  const geoRef = useRef<{ lat: number; lng: number } | null>(null)

  // 마운트 시 GPS 조용히 취득
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => { geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
      () => {}, // 실패 시 무시 → 위치 필터 없이 전국 검색
      { timeout: 5000 }
    )
  }, [])

  // 입력 변경 시 디바운스 검색 (현재 위치 기준)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (searchQuery.trim().length < 1) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const params = new URLSearchParams({ q: searchQuery.trim() })
      if (geoRef.current) {
        params.set('lat', String(geoRef.current.lat))
        params.set('lng', String(geoRef.current.lng))
      }
      try {
        const res = await fetch(`/api/restaurants/search?${params.toString()}`)
        const data = await res.json()
        setSearchResults(data)
        setShowDropdown(true)
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleResultClick = useCallback(() => {
    setShowDropdown(false)
    setSearchQuery('')
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const params = new URLSearchParams({ q: searchQuery.trim() })
      // 마지막으로 선택한 지역이 있으면 검색에 포함
      const savedRegion = typeof window !== 'undefined' ? localStorage.getItem('matzip_region') : ''
      if (savedRegion) params.set('region', savedRegion)
      router.push(`/search?${params.toString()}`)
    }
  }

  const buildRestaurantsUrl = (codes: string[], names: string[]) =>
    `/restaurants?${new URLSearchParams({ region: codes.join(','), name: names.join(',') })}`

  const handlePrefetch = (codes: string[], names: string[]) => {
    router.prefetch(buildRestaurantsUrl(codes, names))
  }

  const handleConfirm = (codes: string[], names: string[]) => {
    // 선택한 지역을 localStorage에 저장 (검색 시 재활용)
    if (typeof window !== 'undefined') {
      localStorage.setItem('matzip_region', names.join(','))
    }
    router.push(buildRestaurantsUrl(codes, names))
  }

  const filteredRecent =
    activeCategory === '전체'
      ? recentRestaurants
      : recentRestaurants.filter((r) => r.category === activeCategory)

  return (
    <div className="flex flex-col bg-zinc-50" style={{ height: 'calc(100dvh - 64px)' }}>
      {/* D: 확장 헤더 — 닉네임 + 맛집 수 + 검색창 */}
      <header className="bg-[#1B4332] px-5 pt-3 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-white">
            안녕하세요 👋{' '}
            <span className="text-emerald-300">{nickname ?? '맛집러'}님</span>
          </p>
          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <LogIn size={12} />
                로그인
              </Link>
            )}
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span className="text-xs font-semibold text-emerald-100">{restaurantCount}개 맛집</span>
            </div>
            <button
              onClick={() => setShowInquiry(true)}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors"
              title="고객센터"
            >
              <Headphones size={12} />
              고객센터
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <form ref={formRef} onSubmit={handleSearch} className="flex-1 relative">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5">
              <Search size={15} className="text-white/50 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                placeholder="맛집 이름, 지역으로 검색"
                inputMode="search"
                autoComplete="off"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              {searching && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white/70 rounded-full animate-spin shrink-0" />
              )}
            </div>

            {/* 실시간 검색 드롭다운 */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl overflow-hidden z-50 border border-zinc-100">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-zinc-400 px-4 py-3 text-center">검색 결과가 없어요</p>
                ) : (
                  <>
                    {searchResults.map(r => {
                      const { bg, text } = getCategoryStyle(r.category)
                      return (
                        <Link
                          key={r.id}
                          href={`/restaurants/${r.id}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 border-b border-zinc-50 last:border-0 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 truncate">{r.name}</p>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {r.road_address || r.address}
                            </p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${bg} ${text}`}>
                            {r.category}
                          </span>
                        </Link>
                      )
                    })}
                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 text-xs text-[#1B4332] font-medium hover:bg-zinc-50 border-t border-zinc-100 text-center"
                    >
                      "{searchQuery}" 전체 검색 결과 보기 →
                    </button>
                  </>
                )}
              </div>
            )}
          </form>
          {/* 주변 맛집 바로가기 */}
          <Link
            href="/restaurants/nearby"
            className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-xl px-3 py-2.5 text-white/80 hover:bg-white/25 transition-colors shrink-0"
            title="주변 맛집"
          >
            <Navigation size={15} />
            <span className="text-xs font-medium">주변</span>
          </Link>
        </div>
      </header>

      {/* B: 카테고리 바로가기 칩 */}
      <div className="bg-white border-b border-zinc-100 px-4 py-1.5 flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat
          if (cat === '전체') {
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {CATEGORY_EMOJI[cat]} {cat}
              </button>
            )
          }
          const { bg, text } = getCategoryStyle(cat)
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isActive
                  ? `${bg} ${text} border-transparent`
                  : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {CATEGORY_EMOJI[cat]} {cat}
            </button>
          )
        })}
      </div>

      {/* 지도 — 남은 공간 대부분 차지 */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-white px-2 py-1 overflow-hidden">
        <KoreaMap onSelect={(code, name) => setModal({ code, name })} />
      </div>

      {/* C: 최근 등록 맛집 미리보기 — 하단 고정 */}
      <div className="shrink-0 bg-white border-t border-zinc-100 pt-2 pb-1">
        <div className="flex items-center justify-between px-4 mb-1.5">
          <p className="text-sm font-bold text-zinc-800">
            {activeCategory === '전체' ? '최근 등록 맛집' : `${activeCategory} 최근 맛집`}
          </p>
          <Link href="/restaurants" className="text-xs font-medium text-[#1B4332]">
            전체 보기 →
          </Link>
        </div>
        {filteredRecent.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-3">등록된 맛집이 없어요</p>
        ) : (
          <div className="flex gap-2.5 px-4 overflow-x-auto scrollbar-none">
            {filteredRecent.map((r) => {
              const { bg, text } = getCategoryStyle(r.category)
              return (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.id}`}
                  className="shrink-0 w-[100px] bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden hover:border-[#1B4332]/30 transition-colors"
                >
                  <div className={`relative h-[48px] overflow-hidden ${!r.thumbnail_url ? bg : ''}`}>
                    {r.thumbnail_url ? (
                      <Image
                        src={r.thumbnail_url}
                        alt={r.name}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl">{CATEGORY_EMOJI[r.category] ?? '🍽️'}</span>
                      </div>
                    )}
                    {r.isFavorited && (
                      <Heart
                        size={11}
                        className="absolute top-1.5 right-2 text-yellow-500 z-10"
                        fill="#EAB308"
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold text-zinc-800 truncate mb-1">{r.name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${bg} ${text}`}>
                      {r.category}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <RegionModal
          provinceCode={modal.code}
          provinceName={modal.name}
          onClose={() => setModal(null)}
          onConfirm={handleConfirm}
          onPrefetch={handlePrefetch}
        />
      )}

      {showInquiry && (
        <InquiryModal
          isLoggedIn={isLoggedIn}
          onClose={() => setShowInquiry(false)}
        />
      )}
    </div>
  )
}
