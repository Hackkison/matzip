'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const KoreaMap = dynamic(() => import('@/components/KoreaMap'), { ssr: false })
const RegionModal = dynamic(() => import('@/components/RegionModal'), { ssr: false })

export default function MapPage() {
  const router = useRouter()
  const [modal, setModal] = useState<{ code: string; name: string } | null>(null)

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
        <h1 className="text-lg font-semibold text-[#1B4332]">지역 선택</h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 gap-4 md:py-12">
        <div className="w-full max-w-lg md:max-w-2xl flex flex-col items-center gap-4">
          <p className="text-sm text-zinc-500">시/도를 선택하세요</p>
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
