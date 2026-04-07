'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Heart } from 'lucide-react'
import { getCategoryStyle } from '@/lib/category'

const KoreaMap = dynamic(() => import('@/components/KoreaMap'), { ssr: false })
const RegionModal = dynamic(() => import('@/components/RegionModal'), { ssr: false })

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
}

export default function MapClient({ nickname, restaurantCount, recentRestaurants }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<{ code: string; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('전체')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const buildRestaurantsUrl = (codes: string[], names: string[]) =>
    `/restaurants?${new URLSearchParams({ region: codes.join(','), name: names.join(',') })}`

  const handlePrefetch = (codes: string[], names: string[]) => {
    router.prefetch(buildRestaurantsUrl(codes, names))
  }

  const handleConfirm = (codes: string[], names: string[]) => {
    router.push(buildRestaurantsUrl(codes, names))
  }

  const filteredRecent =
    activeCategory === '전체'
      ? recentRestaurants
      : recentRestaurants.filter((r) => r.category === activeCategory)

  return (
    <div className="flex flex-col bg-zinc-50" style={{ height: 'calc(100dvh - 64px)' }}>
      {/* D: 확장 헤더 — 닉네임 + 맛집 수 + 검색창 */}
      <header className="bg-[#1B4332] px-5 pt-5 pb-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-white">
            안녕하세요 👋{' '}
            <span className="text-emerald-300">{nickname ?? '맛집러'}님</span>
          </p>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            <span className="text-xs font-semibold text-emerald-100">{restaurantCount}개 맛집</span>
          </div>
        </div>
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5">
            <Search size={15} className="text-white/50 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="맛집 이름, 지역으로 검색"
              inputMode="search"
              autoComplete="off"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
        </form>
      </header>

      {/* B: 카테고리 바로가기 칩 */}
      <div className="bg-white border-b border-zinc-100 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
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
      <div className="flex-1 min-h-0 flex items-center justify-center bg-white px-4 py-3">
        <KoreaMap onSelect={(code, name) => setModal({ code, name })} />
      </div>

      {/* C: 최근 등록 맛집 미리보기 — 하단 고정 */}
      <div className="shrink-0 bg-white border-t border-zinc-100 pt-3 pb-2">
        <div className="flex items-center justify-between px-4 mb-2.5">
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
                  <div className={`relative h-[60px] overflow-hidden ${!r.thumbnail_url ? bg : ''}`}>
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
    </div>
  )
}
