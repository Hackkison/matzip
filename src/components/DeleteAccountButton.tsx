'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteAccountButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('정말 탈퇴하시겠습니까?\n작성한 리뷰는 익명으로 남습니다.')) return
    setLoading(true)
    const res = await fetch('/api/user', { method: 'DELETE' })
    if (!res.ok) {
      alert('탈퇴 처리 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }
    router.push('/login')
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-400">탈퇴 시 작성한 리뷰는 익명으로 유지됩니다.</p>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
      >
        {loading ? '처리 중...' : '회원 탈퇴'}
      </button>
    </div>
  )
}
