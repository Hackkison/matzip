'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileSetupPage() {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) { setError('닉네임을 입력해주세요'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/profile/nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: nickname.trim() }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? '닉네임 저장에 실패했습니다.')
      setLoading(false)
      return
    }

    router.push('/map')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[#1B4332]">닉네임 설정</h1>
          <p className="mt-1 text-sm text-zinc-500">리뷰에 표시될 이름이에요</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="rounded-lg border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-[#1B4332]"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !nickname.trim()}
            className="mt-1 rounded-lg bg-[#1B4332] py-3 text-sm font-medium text-white transition-colors hover:bg-[#163829] disabled:opacity-60"
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
