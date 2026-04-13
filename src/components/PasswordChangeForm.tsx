'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  email: string
}

export default function PasswordChangeForm({ email }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm('')
    setError(''); setSuccess(false)
  }

  const handleSubmit = async () => {
    if (!current) { setError('현재 비밀번호를 입력해주세요'); return }
    if (next.length < 6) { setError('새 비밀번호는 6자 이상이어야 합니다'); return }
    if (next !== confirm) { setError('새 비밀번호가 일치하지 않습니다'); return }

    setLoading(true)
    setError('')

    // 현재 비밀번호 검증
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current })
    if (signInError) {
      setError('현재 비밀번호가 올바르지 않습니다')
      setLoading(false)
      return
    }

    // 비밀번호 변경
    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    if (updateError) {
      setError('비밀번호 변경에 실패했습니다')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setCurrent(''); setNext(''); setConfirm('')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-700">비밀번호 변경</span>
        <span className="text-xs text-zinc-400">변경 →</span>
      </button>
    )
  }

  return (
    <div className="px-4 py-4 rounded-xl border border-zinc-200 bg-white flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-zinc-800">비밀번호 변경</span>
        <button onClick={() => { setOpen(false); reset() }} className="text-xs text-zinc-400 hover:text-zinc-600">
          닫기
        </button>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm font-medium text-[#1B4332]">비밀번호가 변경되었습니다</p>
          <button onClick={() => { setSuccess(false); setOpen(false) }} className="text-xs text-zinc-400 underline">
            확인
          </button>
        </div>
      ) : (
        <>
          {/* 현재 비밀번호 */}
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="현재 비밀번호"
              className="w-full px-3 py-2.5 pr-10 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332]"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
            >
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* 새 비밀번호 */}
          <div className="relative">
            <input
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)"
              className="w-full px-3 py-2.5 pr-10 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332]"
            />
            <button
              type="button"
              onClick={() => setShowNext(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
            >
              {showNext ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* 새 비밀번호 확인 */}
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="새 비밀번호 확인"
            className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332]"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 bg-[#1B4332] text-white rounded-lg text-sm font-medium disabled:opacity-40"
          >
            {loading ? '변경 중...' : '변경하기'}
          </button>
        </>
      )}
    </div>
  )
}
