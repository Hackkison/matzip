'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'

interface Props {
  restaurantId: string
  initialFavorited: boolean
}

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
      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 border ${
        favorited
          ? 'bg-yellow-50 border-yellow-300 text-yellow-600 hover:bg-yellow-100'
          : 'bg-white border-zinc-200 text-zinc-500 hover:border-yellow-300 hover:text-yellow-500 hover:bg-yellow-50'
      }`}
    >
      <Heart
        size={16}
        className={favorited ? 'text-yellow-500' : 'text-zinc-400'}
        fill={favorited ? '#EAB308' : 'none'}
      />
      {favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    </button>
  )
}
