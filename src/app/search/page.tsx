import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin, Search } from 'lucide-react'

const CATEGORIES = ['전체', '한식', '중식', '일식', '양식', '디저트', '기타']

interface Props {
  searchParams: Promise<{ q?: string; cat?: string; region?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { q = '', cat = '', region = '' } = await searchParams
  const category = CATEGORIES.includes(cat) && cat !== '전체' ? cat : ''
  const regionNames = region ? region.split(',').filter(Boolean) : []

  let query = supabase
    .from('restaurants')
    .select('id, name, category, address, road_address, price_range')
    .order('created_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%,road_address.ilike.%${q}%`)
  }
  if (category) {
    query = query.eq('category', category)
  }
  // 지역 필터: 저장된 지역이 있을 때 주소 기준으로 필터링
  if (regionNames.length > 0) {
    const orFilter = regionNames
      .flatMap((rn) => [`road_address.ilike.%${rn}%`, `address.ilike.%${rn}%`])
      .join(',')
    query = query.or(orFilter)
  }

  const { data: restaurants } = q || category ? await query : { data: [] }

  const PRICE_LABEL: Record<number, string> = { 1: '₩', 2: '₩₩', 3: '₩₩₩', 4: '₩₩₩₩' }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href="/map" className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-[#1B4332]">검색</h1>
          {(q || category) && (
            <p className="text-xs text-zinc-400">
              {regionNames.length > 0 && <span className="text-[#1B4332]">{regionNames.join(', ')} · </span>}
              {restaurants?.length ?? 0}건
            </p>
          )}
        </div>
      </header>

      {/* 검색 폼 */}
      <form action="/search" className="px-4 pt-3 md:px-8 flex flex-col gap-2">
        {/* 지역 필터 유지 */}
        {region && <input type="hidden" name="region" value={region} />}
        <div className="relative max-w-lg mx-auto w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="식당명 또는 지역명으로 검색"
            className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none max-w-lg mx-auto w-full pb-2">
          {CATEGORIES.map((c) => {
            const isActive = c === '전체' ? !category : category === c
            return (
              <button
                key={c}
                type="submit"
                name="cat"
                value={c}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  isActive
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#1B4332]'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      </form>

      <main className="flex flex-1 flex-col px-4 py-4 md:px-8 max-w-lg mx-auto w-full gap-3">
        {(!restaurants || restaurants.length === 0) ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-20">
            <p className="text-zinc-400 text-sm">
              {q || category ? '검색 결과가 없어요' : '식당명이나 지역명을 검색해보세요'}
            </p>
          </div>
        ) : (
          restaurants.map((r) => (
            <Link
              key={r.id}
              href={`/restaurants/${r.id}`}
              className="flex items-center gap-3 px-4 py-4 border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-800 leading-snug">{r.name}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.price_range && (
                      <span className="text-xs text-zinc-400">{PRICE_LABEL[r.price_range]}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium">
                      {r.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <MapPin size={11} className="shrink-0" />
                  <span className="truncate">{r.road_address || r.address}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  )
}
