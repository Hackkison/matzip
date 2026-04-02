'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function BackButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-600">
      <ChevronLeft size={20} />
    </button>
  )
}
