'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'

interface Props {
  restaurantId: string
  initialFavorited: boolean
}

// 식당 상세 페이지 즐겨찾기 토글 버튼
export default function FavoriteButton({ restaurantId, initialFavorited }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    const method = favorited ? 'DELETE' : 'POST'
    const res = await fetch(`/api/favorites/${restaurantId}`, { method })
    if (res.ok) setFavorited((prev) => !prev)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center justify-center gap-2 py-2.5 border border-zinc-200 rounded-lg text-sm transition-colors hover:border-[#1B4332] disabled:opacity-40"
    >
      <Heart
        size={16}
        className={favorited ? 'text-[#1B4332]' : 'text-zinc-400'}
        fill={favorited ? '#1B4332' : 'none'}
      />
      <span className={favorited ? 'text-[#1B4332]' : 'text-zinc-500'}>
        {favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      </span>
    </button>
  )
}
