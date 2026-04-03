import { ChevronLeft } from 'lucide-react'

// 맛집 목록 페이지 로딩 스켈레톤
export default function RestaurantsLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        <ChevronLeft size={20} className="text-zinc-300" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" />
          <div className="h-3 w-32 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="h-8 w-16 bg-zinc-100 rounded-lg animate-pulse" />
      </header>
      <div className="px-4 py-4 md:px-8 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-xl border border-zinc-100 animate-pulse">
            <div className="w-20 h-20 rounded-lg bg-zinc-100 shrink-0" />
            <div className="flex flex-col gap-2 flex-1 justify-center">
              <div className="h-4 w-2/5 bg-zinc-100 rounded" />
              <div className="h-3 w-1/4 bg-zinc-100 rounded" />
              <div className="h-3 w-3/5 bg-zinc-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
