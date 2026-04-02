'use client'

import { useState } from 'react'
import RestaurantCard from './RestaurantCard'

const CATEGORIES = ['전체', '한식', '중식', '일식', '양식', '디저트', '기타']

interface Restaurant {
  id: string
  name: string
  category: string
  address: string
  road_address: string | null
  phone: string | null
  image_url: string | null
}

interface Props {
  restaurants: Restaurant[]
}

export default function RestaurantList({ restaurants }: Props) {
  const [active, setActive] = useState('전체')

  const filtered =
    active === '전체' ? restaurants : restaurants.filter((r) => r.category === active)

  return (
    <div className="flex flex-1 flex-col">
      {/* 카테고리 필터 */}
      <div className="border-b border-zinc-100">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 md:px-8 scrollbar-none max-w-3xl mx-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
              active === c
                ? 'bg-[#1B4332] text-white border-[#1B4332]'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#1B4332]'
            }`}
          >
            {c}
          </button>
        ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="flex flex-1 flex-col px-4 py-4 md:px-8 gap-3 max-w-3xl mx-auto w-full">
        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-20">
            <p className="text-zinc-400 text-sm">등록된 맛집이 없어요</p>
            <p className="text-zinc-300 text-xs">첫 번째 맛집을 등록해보세요</p>
          </div>
        ) : (
          filtered.map((r) => <RestaurantCard key={r.id} restaurant={r} />)
        )}
      </div>
    </div>
  )
}
