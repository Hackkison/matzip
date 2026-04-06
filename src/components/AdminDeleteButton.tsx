'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface Props {
  apiUrl: string
  confirmMessage: string
}

// 관리자 전용 삭제 버튼 — 삭제 후 현재 페이지 새로고침
export default function AdminDeleteButton({ apiUrl, confirmMessage }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(confirmMessage)) return
    setDeleting(true)

    const res = await fetch(apiUrl, { method: 'DELETE' })
    if (!res.ok) {
      alert('삭제 중 오류가 발생했습니다.')
      setDeleting(false)
      return
    }

    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
      title="삭제"
    >
      <Trash2 size={14} />
    </button>
  )
}
