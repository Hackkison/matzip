import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin, Phone, Tag } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RestaurantDetailPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single()

  if (!restaurant) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href="/map" className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-base font-semibold text-[#1B4332]">{restaurant.name}</h1>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 md:px-8 max-w-lg mx-auto w-full gap-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium">
            {restaurant.category}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <InfoRow icon={<MapPin size={15} />} label="주소" value={restaurant.road_address || restaurant.address} />
          <InfoRow icon={<Phone size={15} />} label="전화" value={restaurant.phone || '정보 없음'} />
          <InfoRow icon={<Tag size={15} />} label="카테고리" value={restaurant.category} />
        </div>
      </main>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
      <span className="mt-0.5 text-zinc-400">{icon}</span>
      <div>
        <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
        <p className="text-sm text-zinc-700">{value}</p>
      </div>
    </div>
  )
}
