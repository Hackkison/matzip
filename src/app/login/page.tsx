'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError('회원가입에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
        setLoading(false)
      } else {
        router.push('/profile/setup')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        setLoading(false)
      } else {
        router.push('/')
        router.refresh()
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-[#1B4332]">맛집 지도</h1>
          <p className="mt-1 text-sm text-zinc-500">우리만의 맛집을 기록하고 공유해요</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-[#1B4332]"
          />
          <input
            type="password"
            placeholder={isSignUp ? '비밀번호 (6자 이상)' : '비밀번호'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-lg border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-[#1B4332]"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-[#1B4332] py-3 text-sm font-medium text-white transition-colors hover:bg-[#163829] disabled:opacity-60"
          >
            {loading ? (isSignUp ? '가입 중...' : '로그인 중...') : isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-400">
          {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            className="text-[#1B4332] font-medium hover:underline"
          >
            {isSignUp ? '로그인' : '회원가입'}
          </button>
        </p>
      </div>
    </div>
  )
}
