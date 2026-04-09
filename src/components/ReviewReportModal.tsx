'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  reviewId: string
  onClose: () => void
}

export default function ReviewReportModal({ reviewId, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('사유를 입력해주세요'); return }
    setLoading(true)
    setError('')

    const res = await fetch(`/api/reviews/${reviewId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? '요청 중 오류가 발생했습니다.')
      setLoading(false)
      return
    }

    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800">리뷰 삭제 요청</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <>
            <p className="text-sm text-zinc-600 text-center py-4">
              삭제 요청이 전달됐습니다.<br />
              <span className="text-xs text-zinc-400">관리자 검토 후 처리됩니다.</span>
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#1B4332] text-white rounded-lg text-sm"
            >
              확인
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-zinc-500">
              관리자에게 이 리뷰의 삭제를 요청합니다.
            </p>
            <div>
              <label className="text-xs font-medium text-zinc-700 mb-1.5 block">
                요청 사유 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="삭제를 요청하는 이유를 입력해주세요"
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] resize-none"
              />
              <p className="text-right text-xs text-zinc-300 mt-0.5">{reason.length}/200</p>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-500 hover:border-zinc-300"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 bg-[#1B4332] text-white rounded-lg text-sm disabled:opacity-40"
              >
                {loading ? '요청 중...' : '요청하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
