import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/logout-button'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
        <h1 className="text-lg font-semibold text-[#1B4332]">맛집 지도</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-zinc-400 text-sm">지도 기능을 준비 중이에요</p>
        <p className="text-xs text-zinc-300">Phase 2 — SVG 지도 (다음 단계)</p>
      </main>
    </div>
  )
}
