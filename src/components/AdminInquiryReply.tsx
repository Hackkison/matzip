'use client'

import { useState } from 'react'

interface Props {
  inquiryId: string
  existingReply: string | null
}

export default function AdminInquiryReply({ inquiryId, existingReply }: Props) {
  const [reply, setReply] = useState(existingReply ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!reply.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: reply.trim() }),
      })
      if (!res.ok) { setError('저장 실패'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <textarea
        value={reply}
        onChange={e => setReply(e.target.value)}
        placeholder="답변을 입력하세요"
        rows={2}
        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-[#1B4332] resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving || !reply.trim()}
        className="self-end px-3 py-1.5 bg-[#1B4332] text-white text-xs font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saved ? '저장됨 ✓' : saving ? '저장 중...' : existingReply ? '답변 수정' : '답변 저장'}
      </button>
    </div>
  )
}
