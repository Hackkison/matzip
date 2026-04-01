import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin, Search } from 'lucide-react'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { q = '' } = await searchParams

  const { data: restaurants } = q
    ? await supabase
        .from('restaurants')
        .select('id, name, category, address, road_address, phone')
        .ilike('name', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href="/map" className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-[#1B4332]">검색 결과</h1>
          {q && <p className="text-xs text-zinc-400">&ldquo;{q}&rdquo; ({restaurants?.length ?? 0}건)</p>}
        </div>
      </header>

      {/* 재검색 */}
      <form action="/search" className="px-4 py-3 md:px-8 border-b border-zinc-100">
        <div className="relative max-w-lg mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="맛집 이름으로 검색"
            className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
          />
        </div>
      </form>

      <main className="flex flex-1 flex-col px-4 py-4 md:px-8 max-w-lg mx-auto w-full gap-3">
        {(!restaurants || restaurants.length === 0) ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-20">
            <p className="text-zinc-400 text-sm">
              {q ? '검색 결과가 없어요' : '검색어를 입력해주세요'}
            </p>
          </div>
        ) : (
          restaurants.map((r) => (
            <Link
              key={r.id}
              href={`/restaurants/${r.id}`}
              className="flex flex-col gap-1.5 px-4 py-4 border border-zinc-100 rounded-xl hover:border-[#1B4332]/30 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-800 leading-snug">{r.name}</p>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium">
                  {r.category}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{r.road_address || r.address}</span>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  )
}
