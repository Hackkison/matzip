import Link from 'next/link'
import { MapPin } from 'lucide-react'

const PRICE_LABEL: Record<number, string> = {
  1: '₩',
  2: '₩₩',
  3: '₩₩₩',
  4: '₩₩₩₩',
}

interface Restaurant {
  id: string
  name: string
  category: string
  address: string
  road_address: string | null
  phone: string | null
  thumbnail_url: string | null
  price_range: number | null
}

interface Props {
  restaurant: Restaurant
}

export default function RestaurantCard({ restaurant }: Props) {
  const address = restaurant.road_address || restaurant.address

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="flex items-center gap-3 px-4 py-4 border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 hover:bg-zinc-50 transition-colors"
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-800 leading-snug">{restaurant.name}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {restaurant.price_range && (
              <span className="text-xs text-zinc-400 font-medium">
                {PRICE_LABEL[restaurant.price_range]}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium">
              {restaurant.category}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{address}</span>
        </div>
      </div>

      {/* 대표 사진 또는 최신 리뷰 사진 썸네일 */}
      {restaurant.thumbnail_url && (
        <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurant.thumbnail_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </Link>
  )
}
