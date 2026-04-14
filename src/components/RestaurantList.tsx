'use client'

import { useState } from 'react'
import RestaurantCard from './RestaurantCard'
import { ChevronDown } from 'lucide-react'
import { getCategoryStyle } from '@/lib/category'
import { isOpenNow, type BusinessHours } from '@/lib/businessHours'

const CATEGORIES = ['전체', '한식', '중식', '일식', '양식', '디저트', '기타']

const PRICE_FILTERS: { value: number | null; label: string }[] = [
  { value: null, label: '전체' },
  { value: 1, label: '~1만원' },
  { value: 2, label: '1~2만원' },
  { value: 3, label: '2~4만원' },
  { value: 4, label: '5만원~' },
]

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'name', label: '이름순' },
  { value: 'price_asc', label: '금액 낮은순' },
  { value: 'price_desc', label: '금액 높은순' },
  { value: 'rating_desc', label: '별점 높은순' },
  { value: 'review_count_desc', label: '리뷰 많은순' },
]

interface Restaurant {
  id: string
  name: string
  category: string
  address: string
  road_address: string | null
  phone: string | null
  thumbnail_url: string | null
  price_range: number | null
  business_hours: BusinessHours | null
  avg_rating: number | null
  review_count: number
}

interface Props {
  restaurants: Restaurant[]
  favoritedIds?: Set<string>
}

export default function RestaurantList({ restaurants, favoritedIds }: Props) {
  const [active, setActive] = useState('전체')
  const [priceFilter, setPriceFilter] = useState<number | null>(null)
  const [openOnly, setOpenOnly] = useState(false)
  const [sort, setSort] = useState('latest')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const currentSort = SORT_OPTIONS.find(s => s.value === sort)!

  const filtered = restaurants
    .filter((r) => active === '전체' || r.category === active)
    .filter((r) => priceFilter === null || r.price_range === priceFilter)
    // 영업 중 필터: 영업시간 정보 없는 가게는 제외하지 않음
    .filter((r) => !openOnly || isOpenNow(r.business_hours) !== false)

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'ko')
    if (sort === 'price_asc') {
      if (a.price_range === null && b.price_range === null) return 0
      if (a.price_range === null) return 1
      if (b.price_range === null) return -1
      return a.price_range - b.price_range
    }
    if (sort === 'price_desc') {
      if (a.price_range === null && b.price_range === null) return 0
      if (a.price_range === null) return 1
      if (b.price_range === null) return -1
      return b.price_range - a.price_range
    }
    if (sort === 'rating_desc') {
      // 리뷰 없는 가게는 맨 뒤로
      if (a.avg_rating === null && b.avg_rating === null) return 0
      if (a.avg_rating === null) return 1
      if (b.avg_rating === null) return -1
      return b.avg_rating - a.avg_rating
    }
    if (sort === 'review_count_desc') {
      return b.review_count - a.review_count
    }
    return 0 // latest: 서버에서 이미 최신순 정렬됨
  })

  return (
    <div className="flex flex-1 flex-col">
      {/* 카테고리 필터 + 정렬 */}
      <div className="border-b border-zinc-100">
        <div className="flex items-center gap-2 px-4 py-3 md:px-8 max-w-3xl mx-auto">
          <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0">
            {CATEGORIES.map((c) => {
              const { bg, text } = c === '전체' ? { bg: 'bg-[#1B4332]', text: 'text-white' } : getCategoryStyle(c)
              return (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active === c
                      ? `${bg} ${text} border-transparent`
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {c}
                </button>
              )
            })}
          </div>

          {/* 정렬 드롭다운 */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSortMenu(v => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-zinc-200 text-zinc-600 hover:border-[#1B4332] transition-colors"
            >
              {currentSort.label}
              <ChevronDown size={12} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-10 min-w-[110px] overflow-hidden">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setShowSortMenu(false) }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      sort === opt.value
                        ? 'bg-[#1B4332]/10 text-[#1B4332] font-medium'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 가격대 필터 + 영업 중 필터 */}
      <div className="flex items-center gap-3 px-4 py-2 md:px-8 max-w-3xl mx-auto w-full border-b border-zinc-100">
        <span className="text-xs text-zinc-400 shrink-0">가격대</span>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
          {PRICE_FILTERS.map((p) => (
            <button
              key={String(p.value)}
              onClick={() => setPriceFilter(p.value)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                priceFilter === p.value
                  ? 'bg-[#1B4332] text-white border-transparent'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpenOnly(v => !v)}
          className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            openOnly
              ? 'bg-green-600 text-white border-transparent'
              : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${openOnly ? 'bg-white' : 'bg-green-400'}`} />
          영업 중
        </button>
      </div>

      {/* 목록 */}
      <div className="flex flex-1 flex-col px-4 py-4 md:px-8 gap-3 max-w-3xl mx-auto w-full">
        {sorted.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-20">
            <p className="text-zinc-400 text-sm">등록된 맛집이 없어요</p>
            <p className="text-zinc-300 text-xs">첫 번째 맛집을 등록해보세요</p>
          </div>
        ) : (
          sorted.map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              isFavorited={favoritedIds?.has(r.id) ?? false}
            />
          ))
        )}
      </div>
    </div>
  )
}
