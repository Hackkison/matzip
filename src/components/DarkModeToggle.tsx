'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  // 마운트 시 저장된 설정 반영
  useEffect(() => {
    const saved = localStorage.getItem('matzip_dark') === '1'
    setDark(saved)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('matzip_dark', '1')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('matzip_dark', '0')
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 transition-colors"
    >
      <div className="flex items-center gap-3">
        {dark ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-400" />}
        <span className="text-sm font-medium text-zinc-700">야간 모드</span>
      </div>
      {/* 토글 스위치 */}
      <div className={`relative w-10 h-5.5 rounded-full transition-colors ${dark ? 'bg-[#1B4332]' : 'bg-zinc-200'}`}>
        <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  )
}
