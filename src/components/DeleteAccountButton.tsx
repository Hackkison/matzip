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
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
    >
      {loading ? '처리 중...' : '회원 탈퇴'}
    </button>
  )
}
