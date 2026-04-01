import Link from 'next/link'
import { MapPin } from 'lucide-react'

interface Restaurant {
  id: string
  name: string
  category: string
  address: string
  road_address: string | null
  phone: string | null
}

interface Props {
  restaurant: Restaurant
}

export default function RestaurantCard({ restaurant }: Props) {
  const address = restaurant.road_address || restaurant.address

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="flex flex-col gap-1.5 px-4 py-4 border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 hover:bg-zinc-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-800 leading-snug">{restaurant.name}</p>
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium">
          {restaurant.category}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <MapPin size={11} className="shrink-0" />
        <span className="truncate">{address}</span>
      </div>
    </Link>
  )
}
