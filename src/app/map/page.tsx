'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { User, Search, Map } from 'lucide-react'

const KoreaMap = dynamic(() => import('@/components/KoreaMap'), { ssr: false })
const RegionModal = dynamic(() => import('@/components/RegionModal'), { ssr: false })

export default function MapPage() {
  const router = useRouter()
  const [modal, setModal] = useState<{ code: string; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleProvinceSelect = (code: string, name: string) => {
    setModal({ code, name })
  }

  const handleConfirm = (codes: string[], names: string[]) => {
    const params = new URLSearchParams({
      region: codes.join(','),
      name: names.join(','),
    })
    router.push(`/restaurants?${params.toString()}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center border-b border-zinc-100 px-6 py-4">
        <h1 className="flex-1 text-lg font-semibold text-[#1B4332]">지역 선택</h1>
        <Link href="/kakaomap" className="text-zinc-400 hover:text-[#1B4332] transition-colors mr-3">
          <Map size={20} />
        </Link>
        <Link href="/mypage" className="text-zinc-400 hover:text-[#1B4332] transition-colors">
          <User size={20} />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-4 gap-2 md:py-6">
        <div className="w-full max-w-sm md:max-w-2xl lg:max-w-4xl flex flex-col items-center gap-2">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-[#1B4332]">맛집 지도</h2>
          <p className="text-sm md:text-base text-zinc-500 mb-1">시/도를 선택하거나 검색하세요</p>

          {/* 검색바 */}
          <form onSubmit={handleSearch} className="w-full max-w-sm mb-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="식당명 또는 지역명으로 검색"
                inputMode="search"
                autoComplete="off"
                className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
          </form>
          <KoreaMap onSelect={handleProvinceSelect} />
        </div>
      </main>

      {modal && (
        <RegionModal
          provinceCode={modal.code}
          provinceName={modal.name}
          onClose={() => setModal(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
