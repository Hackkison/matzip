import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'

interface Props {
  searchParams: Promise<{ region?: string; name?: string }>
}

export default async function RestaurantsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { region, name } = await searchParams
  const regionNames = name ? name.split(',') : []

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <Link href="/map" className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-[#1B4332]">맛집 목록</h1>
          {regionNames.length > 0 && (
            <p className="text-xs text-zinc-400">{regionNames.join(', ')}</p>
          )}
        </div>
        <Link
          href={`/restaurants/register?region=${region ?? ''}&name=${name ?? ''}`}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-medium"
        >
          <Plus size={15} />
          등록
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-2 text-center px-6">
        <p className="text-zinc-400 text-sm">맛집 목록 기능을 준비 중이에요</p>
        <p className="text-xs text-zinc-300">Phase 4 — 맛집 목록 (다음 단계)</p>
      </main>
    </div>
  )
}
