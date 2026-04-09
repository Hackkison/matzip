'use client'

import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

interface Props {
  title: string
  text: string
  url: string
}

export default function ShareButton({ title, text, url }: Props) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    // 모바일: 네이티브 공유 시트 (카카오톡, 인스타 등 앱 선택 가능)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // 사용자가 취소한 경우 무시
      }
      return
    }

    // 데스크톱: 클립보드에 링크 복사
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API 불가 환경 (구형 브라우저) 폴백
      window.prompt('링크를 복사하세요', url)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex flex-1 items-center justify-center gap-2 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
    >
      {copied ? <Check size={14} className="text-[#1B4332]" /> : <Share2 size={14} />}
      {copied ? '링크 복사됨' : '공유하기'}
    </button>
  )
}
