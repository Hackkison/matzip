import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Heart, Star } from 'lucide-react'
import { getCategoryStyle } from '@/lib/category'

const PRICE_LABEL: Record<number, string> = {
  1: '~1만원',
  2: '1~2만원',
  3: '2~4만원',
  4: '5만원~',
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
  avg_rating?: number | null
  review_count?: number
}

interface Props {
  restaurant: Restaurant
  isFavorited?: boolean
}

export default function RestaurantCard({ restaurant, isFavorited = false }: Props) {
  const address = restaurant.road_address || restaurant.address
  const { bg, text } = getCategoryStyle(restaurant.category)

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="flex items-center gap-3 px-4 py-3.5 bg-white border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 hover:shadow-sm transition-all"
    >
      {/* 썸네일 */}
      <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-zinc-100">
        {restaurant.thumbnail_url ? (
          <Image
            src={restaurant.thumbnail_url}
            alt={restaurant.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${bg}`}>
            <span className={`text-xl font-bold ${text}`}>
              {restaurant.name[0]}
            </span>
          </div>
        )}
        {/* 즐겨찾기 뱃지 */}
        {isFavorited && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
            <Heart size={11} className="text-yellow-500" fill="#EAB308" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-800 truncate">{restaurant.name}</p>
          {restaurant.price_range && (
            <span className="shrink-0 text-xs text-zinc-400 font-medium">
              {PRICE_LABEL[restaurant.price_range]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
            {restaurant.category}
          </span>
          {restaurant.avg_rating != null && (
            <div className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
              <Star size={10} fill="#F59E0B" className="shrink-0" />
              <span>{restaurant.avg_rating.toFixed(1)}</span>
              {restaurant.review_count != null && restaurant.review_count > 0 && (
                <span className="text-zinc-400 font-normal ml-0.5">({restaurant.review_count})</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <MapPin size={10} className="shrink-0" />
          <span className="truncate">{address}</span>
        </div>
      </div>
    </Link>
  )
}
