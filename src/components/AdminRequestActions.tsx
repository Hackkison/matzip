'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'

interface Props {
  requestId: string
}

export default function AdminRequestActions({ requestId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)

  const handle = async (action: 'approved' | 'rejected') => {
    const msg = action === 'approved'
      ? '리뷰를 삭제하고 요청을 승인할까요?'
      : '이 요청을 반려할까요?'
    if (!confirm(msg)) return

    setLoading(action)
    const res = await fetch(`/api/admin/review-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    if (!res.ok) {
      alert('처리 중 오류가 발생했습니다.')
      setLoading(null)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex gap-1 shrink-0">
      <button
        onClick={() => handle('approved')}
        disabled={!!loading}
        title="승인 (리뷰 삭제)"
        className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors disabled:opacity-40"
      >
        <Check size={14} />
      </button>
      <button
        onClick={() => handle('rejected')}
        disabled={!!loading}
        title="반려"
        className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded transition-colors disabled:opacity-40"
      >
        <X size={14} />
      </button>
    </div>
  )
}
